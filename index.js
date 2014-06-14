/**
 * NAME1        Undecorated Role/Permission
 * NAME2:       Partial Role/Permission
 * NAME3:DEC    Decorated Role/Permission
 *
 * Decoration Inheritance
 *     1.  Partial Permissions assigned to Role inherit the decoration
 *         of the Role
 *     2.  Partial Permissions assigned to the User do not inherit
 *         decorations
 *     3.  Partial Roles do no inherit decorations
 *
 * Matching rules:
 *     When using .userHasRole() and .userHasPermission(), the following rules
 *     apply:
 *     1. KEY:DECOR and KEY:DECOR always match
 *     2. KEY and KEY:DECOR never match
 *     3. KEY and KEY:* always match
 *     4. KEY:DECOR and KEY:* do not match if the user role or permission is
 *        KEY:DECOR and the test role or permission is KEY:*
 *     5. KEY:DECOR and KEY:* match if the user role or permission is KEY:* and
 *        the test role or permission is KEY:DECOR
 */
'use strict';


// ==== PRIVATE FUNCTIONS ======================================================


/**
 * Makes an array unique
 * @param  {Array} ary Array of things
 * @return {Array}     Array of unique things
 */
var unique = function(ary) {
    return ary.reduce(function(p, c) {
        if (p.indexOf(c) === -1) {p.push(c);}
        return p;
    }, []);
};

/**
 * Splits a decorated Role or Permission in to its parts
 * @param  {string} roleperm decorated or undecorated
 * @return {array}              First element is the Role
 *                              Second element is an array of strings.
 *                              Second element is empty array if roleperm
 *                              is undecorated
 */
var getParts = function(roleperm) {
    var a = roleperm.split(':');
    return [a.shift(), a];
};


/**
 * Decorates permissions based on their role
 * @param  {Array} permissions Array of strings (permissions to decorate)
 * @param  {Array} decorations Array of strings (decorations to use)
 * @return {array}             Array of strings
 *
 * A Partial role will retur Partial Permissions
 */
var decoratePermissions = function(permissions, decorations) {
    var allDecorations = decorations.join(':');

    if ('String' === typeof(permissions)) {
        permissions = [permissions];
    }
    if ('String' === typeof(decorations)) {
        decorations = [decorations];
    }

    if (permissions.length === 0 || decorations.length === 0) { return permissions; }

    var decoratedPermissions = permissions.reduce(function(p, c) {
        var permParts = c.split(':');
        if (permParts.length - 1 === decorations.length) {
            p.push(permParts[0] + ":" + allDecorations);
        } else {
            p.push(c);
        }
        return p;

    }, []);

    return decoratedPermissions;
};


var match = function(key, ary) {
    var root = getParts(key)[0];

    var isSame = function(el, ix, ar) {
        return el === key || el === root + ':*';
    }

    return ary.some(isSame);
};


// ==== CLASS DEFINITION =======================================================
function Permissions() {
    this._roles = {};
}


Permissions.prototype.roles = function(role, schema) {
    // Passing just a role name will retrieve the role
    if (!schema) {
        return this._roles[role];
    }
    return this._roles[role] = schema;
};


/**
 * Returns the roles object containing all roles
 * @return {Object}    all registered rolls
 */
Permissions.prototype.allRoles = function() {
    return this._roles;
};

/**
 * clears the internal cache of roles
 * @return nothing
 */
Permissions.prototype.clearRoles = function() {
    this._roles = {};
};


/**
 * Returns a flattened list of roles
 * @param  {string} role Top level role
 * @return {Array}                 List of roles
 */
Permissions.prototype.collectRoles = function(role) {
    var roles = (this._roles[role]) ? this._roles[role].roles : [];
};


/**
 * Recursively find and decorate permissions for the role
 * and all nested roles
 * @param  {String} role the decorated role
 * @param  {Array} path     Array of searched roles to prevent
 *                          an infinite loop
 * @return {Array}      Array of decorated permissions
 */
Permissions.prototype.getRolePermissions = function(role, path) {
    var self = this;

    if (!role || !('String' === typeof role)) { return []; }
    if (!path) { path = []; };

    var roleScheme = this.getRoleScheme(role);
    if (!roleScheme) { return []; }

    // Keep a record of where we've been so not to get in an infinite loop
    // Use the decorated role to distinguish between
    // SOMEROLE:USER1 and SOMEROLE:USER2
    path.push(role);

    var permissionsList = roleScheme.roles.reduce(function(p, c) {
        if (path.indexOf(c) === -1) {
            return p.concat(self.getRolePermissions(c, path));
        } else {
            return p;
        }
    }, decoratePermissions(roleScheme.permissions,getParts(role)[1]));

    return unique(permissionsList);
}



/**
 * Get the scheme for a given rolw
 * @param  {string} role Decorated or undecorated role
 * @return {object}      Scheme object matching role, or null
 */
Permissions.prototype.getRoleScheme = function(role) {
    var name = getParts(role)[0];
    return this._roles[name] || this._roles[name + ':'];
};

Permissions.prototype.getUserRoles = function(user) {
    var roles = user.roles;
    roles = user.roles.reduce(function(p, userRole) {
        var role = this.getRoleScheme(userRole);
        return p.concat( (role) ? role.roles : []);
    }, roles);
    return unique(roles);
};


/**
 * Builds array of all permissions for user
 * @param  {Object} user User Object which has `roles` and
 *                       `permissions` parameters
 * @return {Array}      Decorated Permissions
 */
Permissions.prototype.getUserPermissions = function(user) {
    var self = this;
    var permissions = user.permissions;
    if (permissions && !(permissions instanceof Array)) { permissions = [permissions]; }

    var roles = user.roles;
    if (roles && !(roles instanceof Array)) { roles = [roles]; }

    permissions = roles.reduce(function(p, role) {
        return p.concat(self.getRolePermissions(role));
    }, permissions);

    return unique(permissions);
};


Permissions.prototype.userHasRole = function(user, role) {
    var roles = this.getUserRoles(user);
    return match(role, user.roles);
};

Permissions.prototype.userHasPermission = function(user, permission) {

}


var permissions = exports = module.exports = new Permissions;
