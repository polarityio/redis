'use strict';

const redis = require('redis');
const _ = require('lodash');
const async = require('async');

const entityTemplateReplacementRegex = /{{entity}}/gi;

let Logger;
let client = null;
let clientOptions;

/**
 * This method is called once when the integration is first started.  It is passed a Bunyan logging object
 * that we can save and use to log data to the integration log file.
 * @param logger
 */
function startup(logger) {
  Logger = logger;
}

async function doLookup(entities, options, cb) {
  let lookupResults = [];

  Logger.trace({ entities: entities }, 'doLookup');

  try {
    await _initRedisClient(options);
  } catch (error) {
    Logger.error(error, 'Failed to initialize Redis client');
    return cb(errorToPojo(error));
  }

  async.each(
    entities,
    async function (entityObj) {
      const result = await _lookupEntity(entityObj, options);
      lookupResults.push(result);
    },
    function (err) {
      if (err) {
        Logger.error(err, 'lookupEntity error');
      }
      Logger.trace({ lookupResults: lookupResults }, 'Lookup Results');
      cb(err, lookupResults);
    }
  );
}

/**
 * Initializes the redis client if it has not already been initialized.  In addition, if the connection options
 * have been changed by the user, the client is recreated to reflect the new connection options.  Finally, this method
 * selects the correct database as specified by the integration options.
 *
 * @param integrationOptions
 * @param cb
 * @private
 */
async function _initRedisClient(integrationOptions) {
  if (typeof clientOptions === 'undefined') {
    clientOptions = {
      socket: {
        host: integrationOptions.host,
        port: integrationOptions.port,
        tls: integrationOptions.enableTls
      },
      database: +integrationOptions.database
    };

    if (integrationOptions.password) {
      clientOptions.password = integrationOptions.password;
    }
  }

  let newOptions = {
    socket: {
      host: integrationOptions.host,
      port: integrationOptions.port,
      tls: integrationOptions.enableTls
    },
    database: +integrationOptions.database
  };

  if (integrationOptions.password) {
    newOptions.password = integrationOptions.password;
  }

  if (client === null || _optionsHaveChanged(clientOptions, newOptions)) {
    clientOptions = newOptions;
    Logger.debug({ clientOptions, isOpen: client ? client.isOpen : false }, 'Client Options');
    if (client !== null && client.isOpen) {
      Logger.info('Disconnecting Existing Redis Client');
      // You can only quit if the client is open
      await client.quit();
      client = null;
      Logger.info('Finished disconnecting');
    }

    try {
      client = redis.createClient(clientOptions);
      await client.connect();
      await client.select(integrationOptions.database);
    } catch (connectError) {
      Logger.error(connectError);
      client = null;
      throw connectError;
    }
  }
}

/**
 * Compares two javascript object literals and returns true if they are the same, false if not.  Is used
 * to determine if a user has changed Redis connection options since the last lookup.
 *
 * @param options1
 * @param options2
 * @returns {boolean}
 * @private
 */
function _optionsHaveChanged(options1, options2) {
  return !_.isEqual(options1, options2);
}

async function _lookupEntity(entityObj, options) {
  const result = await _doRedisLookup(entityObj.value, options);
  if (result) {
    // In our example we are storing valid JSON as the Redis key's value.  As a result, we need
    // to parse it pack into a javascript object literal.
    let parsedResult = _parseRedisResult(result, options);

    return {
      // Required: This is the entity object passed into the integration doLookup method
      entity: entityObj,
      // Required: An object containing everything you want passed to the template
      data: {
        // Required: These are the tags that are displayed in your template
        summary: _getSummaryTags(parsedResult, options),
        // Data that you want to pass back to the notification window details block
        details: parsedResult
      }
    };
  } else {
    // There was no data for this entity so we return `null` data which will cause the integration
    // cache to cache this lookup as a miss.
    return { entity: entityObj, data: null };
  }
}

function _getSummaryTags(parsedResult, options) {
  const tags = [];
  if (typeof parsedResult === 'string') {
    if (parsedResult.length > 20) {
      tags.push(parsedResult.substring(0, 20) + '...');
    } else {
      tags.push(parsedResult);
    }
  } else {
    options.summaryTags.split(',').forEach((token) => {
      token = token.trim();
      // token can have the format of 'displayValue:jsonKey' so we split on ':'
      // and check.
      const subTokens = token.split(':');

      if (subTokens.length > 1) {
        const displayValue = subTokens[0];
        const key = subTokens[1];
        const result = _.get(parsedResult, key);

        Logger.info({ key, displayValue, result }, 'result');

        if (typeof result !== 'undefined') {
          tags.push(`${displayValue}: ${result}`);
        }
      } else {
        const key = subTokens[0];
        const result = _.get(parsedResult, key);

        Logger.info({ key, result }, 'result');

        if (typeof result !== 'undefined') {
          tags.push(result);
        }
      }
    });
  }
  Logger.debug({ tags }, 'Summary Tags');
  return tags;
}

/**
 * This function implements the Redis lookup logic you would like to use to retrieve data from your Redis instance.
 * In the provided example we are getting the key that matches the entity's value.
 *
 * @param entityObj
 * @param cb
 * @private
 */
async function _doRedisLookup(entityValue, options) {
  if (options.key.toLowerCase() === '{{entity}}') {
    // no substitution needed since we are doing a straight key lookup
    return await client.get(entityValue);
  } else {
    const lookupKey = options.key.replace(entityTemplateReplacementRegex, entityValue);
    return await client.get(lookupKey);
  }
}

/**
 * Accepts the raw output from the redis lookup command implemented in
 * `_doRedisLookup()`.  Should do any processing required on this data (e.g., convert
 * a JSON string literal into a Javascript Object literal).
 *
 * @param redisResult
 * @private
 */
function _parseRedisResult(redisResult, options) {
  if (options.isJson) {
    try {
      return JSON.parse(redisResult);
    } catch (e) {
      return 'The retrieved value was not properly formatted JSON.  Please uncheck the option JSON';
    }
  } else {
    Logger.info({ redisResult }, 'Result');
    return redisResult;
  }
}

function errorToPojo(err, detail) {
  return err instanceof Error
    ? {
        ...err,
        name: err.name,
        message: err.message,
        stack: err.stack,
        detail: detail ? detail : err.detail ? err.detail : err.message ? err.message : 'Unexpected error encountered'
      }
    : err;
}

/**
 * This method is called anytime a user tries to update options for this integration via the integration
 * page.  This method should return errors if the options do not validate.
 * @param options
 */
function validateOptions(userOptions, cb) {
  Logger.debug({ userOptions: userOptions }, 'Validating User Options');

  let errors = [];

  if (
    typeof userOptions.host.value !== 'string' ||
    (typeof userOptions.host.value === 'string' && userOptions.host.value.length === 0)
  ) {
    errors.push({
      key: 'host',
      message: 'You must provide a host value'
    });
  }

  if (_.isNaN(userOptions.port.value) || userOptions.port.value < 0) {
    errors.push({
      key: 'port',
      message: 'You must provide the port Redis is running on'
    });
  }

  if (_.isNaN(userOptions.database.value) || userOptions.database.value < 0) {
    errors.push({
      key: 'database',
      message: 'You must provide the Redis database you are connecting to'
    });
  }

  cb(null, errors);
}

module.exports = {
  doLookup: doLookup,
  startup: startup,
  validateOptions: validateOptions
};
