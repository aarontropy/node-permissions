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
 * Roles can be decorated by appending `:<decoration>` to the role
 * Decorated roles are narrower in scope than undecorated roles
 * A role decorated with `*` is equivalent to an undecorated role
 *
 * Defining roles
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
    return [a.shift(), a.join(':')];
};


/**
 * Decorates a list of strings based on their role
 * @param  {Array} permissions Array of strings (permissions to decorate)
 * @param  {Array} decorations Array of strings (decorations to use)
 * @return {array}             Array of strings
 *
 * A Partial role will retur Partial Permissions
 */
var decorateList = function(items, decoration) {
    if ('String' === typeof(items)) {
        items = [items];
    }

    

    if (!items || items.length === 0) { return []; }

    return items.reduce(function(p, c) {
        if (c.charAt(c.length-1) === ':') {
            p.push(c + decoration);
        } else {
            p.push(c);
        }
        return p;
    }, []);

    // var decoratedPermissions = permissions.reduce(function(p, c) {
    //     var permParts = c.split(':');
    //     if (permParts.length - 1 === decorations.length) {
    //         p.push(permParts[0] + ":" + allDecorations);
    //     } else {
    //         p.push(c);
    //     }
    //     return p;

    // }, []);

    // return decoratedPermissions;
    // return permissions;
};


var match = function(key, ary) {
    var rd = getParts(key);

    // when matching, an undecorated role or permission is the same as 
    // its counterpart decorated with `*`
    // if (rd[1] === '') { rd[1] = '*'; }

    var isSame = function(el, ix, ar) {
        var urd = getParts(el);
        if (urd[1] === '') { urd[1] = '*'; }
        return el === key || (urd[0] === rd[0] && (urd[1] === '*' || rd[1] === '*') );
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

    // If the user defines the role with a string ending in `:`, set
    // requireDecoration true and remove `:` character
    if (role.charAt(role.length-1) === ':') {
        role = role.slice(0,-1);
        schema.requireDecoration = true;
    } else {
        schema.requireDecoration = schema.requireDecoration || false;
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
// ELIMINATE
Permissions.prototype.getRolePermissions = function(fullRole) {
    var self = this;

    if (!fullRole || !('String' === typeof fullRole)) { return []; }

    var role_decoration = getParts(fullRole);
    var role = self._roles[role_decoration[0]];

    if (!role) { return []; }

    return decorateList(role.permissions, role_decoration[1])

}



/**
 * Get the scheme for a given rolw
 * @param  {string} role Decorated or undecorated role
 * @return {object}      Scheme object matching role, or null
 */
Permissions.prototype.getRole = function(role) {
    var name = getParts(role)[0];
    return this._roles[name] || this._roles[name + ':'];
};



Permissions.prototype.getNestedRoles = function(fullRole, path) {
    var self = this;

    if(!path || !(path instanceof Array)) { path = []; }

    // prevent infinite loops
    if (path.indexOf(fullRole) !== -1) { return []; }
    path.push(fullRole);

    var role_decoration = getParts(fullRole);
    var role = self._roles[role_decoration[0]];

    if (!role) { return []; }

    // check if decoration is required.
    // Set default decoration if missing and not required
    if(role_decoration[1] === '') {
        if (role.requireDecoration) {
            return [];
        }
        // role_decoration[1] = '*';
    }

    // decorate the roles as needed
    var roles = decorateList(role.roles, role_decoration[1]);

    return roles.reduce(function(p, current) {
        return p.concat(self.getNestedRoles(current, path));
    },[fullRole]);

};

Permissions.prototype.getUserRoles = function(user) {
    var self = this;

    return user.roles.reduce(function(p, userRole) {
        return p.concat(self.getNestedRoles(userRole));
    }, []);
};


/**
 * Builds array of all permissions for user
 * @param  {Object} user User Object which has `roles` and
 *                       `permissions` parameters
 * @return {Array}      Decorated Permissions
 */
Permissions.prototype.getUserPermissions = function(user) {
    var self = this;
    var permissions = user.permissions || [];
    if ( !(permissions instanceof Array)) { permissions = [permissions]; }

    var roles = this.getUserRoles(user);

    permissions = roles.reduce(function(p, role) {
        var role_decoration = getParts(role);

        return p.concat(decorateList(self._roles[role_decoration[0]].permissions, role_decoration[1]));
    }, permissions);

    return unique(permissions);
};


// ==== MATCHING FUNCTIONS =====================================================
Permissions.prototype.userHasRole = function(user, findRole) {
    var roles = this.getUserRoles(user);
    return match(findRole, roles);
};

Permissions.prototype.userHasPermission = function(user, findPermission) {
    var permissions = this.getUserPermissions(user);
    return match(findPermission, permissions);
};


var permissions = exports = module.exports = new Permissions;
