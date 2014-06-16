'use strict';

var test_permission = function() {
	var Permissions = require('../');
	Permissions.roles('OTHER_ROLE', {roles: [], permissions: ['OTHER_PERM']});
};

exports = module.exports = test_permission;