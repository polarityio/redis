module.exports = {
  /**
   * Name of the integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @required
   */
  name: 'Redis',
  /**
   * The acronym that appears in the notification window when information from this integration
   * is displayed.  Note that the acronym is included as part of each "tag" in the summary information
   * for the integration.  As a result, it is best to keep it to 4 or less characters.  The casing used
   * here will be carried forward into the notification window.
   *
   * @type String
   * @required
   */
  acronym: 'RED',
  /**
   * Description for this integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @optional
   */
  description: 'Query Redis servers and return data for configured key patterns.',
  logging: { level: 'info' },
  entityTypes: ['IPv4', 'IPv4CIDR', 'IPv6', 'domain', 'url', 'MD5', 'SHA1', 'SHA256', 'email', 'cve', 'MAC', 'string'],
  defaultColor: 'light-gray',
  /**
   * An array of style files (css or less) that will be included for your integration. Any styles specified in
   * the below files can be used in your custom template.
   *
   * @type Array
   * @optional
   */
  styles: ['./styles/styles.less'],
  /**
   * Provide custom component logic and template for rendering the integration details block.  If you do not
   * provide a custom template and/or component then the integration will display data as a table of key value
   * pairs.
   *
   * @type Object
   * @optional
   */
  block: {
    component: {
      file: './components/block.js'
    },
    template: {
      file: './templates/block.hbs'
    }
  },
  // The following request options are not currently supported by the Redis integration
  request: {
    cert: '',
    key: '',
    passphrase: '',
    ca: '',
    proxy: ''
  },
  /**
   * Options that are displayed to the user/admin in the Polarity integration user-interface.  Should be structured
   * as an array of option objects.
   *
   * @type Array
   * @optional
   */
  options: [
    {
      key: 'host',
      name: 'Redis Host',
      description:
        'The hostname of the server hosting your Redis instance. This option should be set to "Only Admins can view and edit".',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'port',
      name: 'Redis Port',
      description:
        'The port your redis instance is listening on.  Defaults to 6379. This option should be set to "Only Admins can view and edit".',
      default: 6379,
      type: 'number',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'database',
      name: 'Redis Database ID',
      description:
        'The Redis database you are connecting to. Defaults to 0. This option should be set to "Only Admins can view and edit".',
      default: 0,
      type: 'number',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'password',
      name: 'Authentication Password',
      description:
        'If provided, the integration will first authenticate to your Redis instance as the "default" user via the provided password.  If left blank, no authentication will be used.  The integration does not currently support Redis ACLs. This option should be set to "Only Admins can view and edit".',
      default: '',
      type: 'password',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'key',
      name: 'Redis Key Pattern',
      description:
        'The Redis key pattern you wish to lookup.  The string "{{entity}}" will be replaced by the entity value being looked up. For example, if your Redis keys are of the format "ip:8.8.8.8", you would set the key pattern to "ip:{{entity}}".',
      default: '{{entity}}',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'isJson',
      name: 'Value is JSON',
      description:
        'If checked, the integration will assume the value of the key is a properly formatted JSON object.  If not checked, the integration treats the value as a string.',
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'summaryTags',
      name: 'Summary Tags',
      description:
        'If the "Value is JSON" option is checked, then you can use this option to specify the JSON keys that should be displayed as summary tags.  ' +
        'Provide a comma delimited list of keys (JSON dot notation is supported).  To add labels to the keys, format the key as "<label>:<key>".',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'viewAsTable',
      name: 'View JSON as Table',
      description:
        'If checked and the "Value is JSON" option is enabled, the JSON will be displayed as a table.  If not checked, the JSON will be displayed as a JSON object.',
      default: false,
      type: 'boolean',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'enableTls',
      name: 'Enable TLS',
      description:
        'If checked, the integration will attempt to connect to your Redis instance over TLS (supported from Redis version 6 onward).  See https://redis.io/topics/encryption for more information. This option should be set to "Only Admins can view and edit".',
      default: false,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    }
  ]
};
