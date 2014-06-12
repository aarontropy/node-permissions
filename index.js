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

}


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


// ==== CLASS DEFINITION =======================================================
function Permissions(roleSchemes) {
    this._roleSchemes = roleSchemes;
}

/**
 * Returns a flattened list of roles
 * @param  {string} role Top level role
 * @return {Array}                 List of roles
 */
Permissions.prototype.collectRoles = function(role) {
    var roles = this._roleSchemes[role].roles;
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

    if (!role) { return []; }
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

    // TODO: unique permissions
    return permissionsList;
}



/**
 * Get the scheme for a given rolw
 * @param  {string} role Decorated or undecorated role
 * @return {object}      Scheme object matching role, or null
 */
Permissions.prototype.getRoleScheme = function(role) {
    var name = getParts(role)[0];
    return this._roleSchemes[name] || this._roleSchemes[name + ':'];
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



exports = module.exports = Permissions;