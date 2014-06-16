'use strict';


var Permissions = require('../');
var assert = require('assert');

assert.sameSet = function(ary1, ary2, message) {
    if (!message) { message = ary1 + " sameSet " + ary2; }

    if (!ary1 instanceof Array) { ary1 = [ary1]; }
    if (!ary2 instanceof Array) { ary2 = [ary2]; }

    assert.equal(ary1.length, ary2.length, message);

    var _ary1 = ary1.sort();
    var _ary2 = ary2.sort();

    _ary1.reduce(function(p, c, i, a) {
        if (c instanceof Array) {
            assert.sameSet(c, _ary2[i]);
        } else {
            assert.deepEqual(c, _ary2[i], message);
        }
        return null
    }, null);


}


describe('Permissions', function() {
    
    after(function() {
        Permissions.clearRoles();
    })

    it('caches a role', function() {
        Permissions.roles('TEST1', {roles: [], permissions:['PERM1']});
        assert.equal('PERM1', Permissions.roles('TEST1').permissions[0]);
    });

    it('caches a role that requires decoration', function() {
        Permissions.clearRoles();
        Permissions.roles('DEC1:', {roles: [], permissions: []});
        var roles = Permissions.allRoles();
        assert.ok(roles.hasOwnProperty('DEC1'));
        assert.ok(roles.DEC1.requireDecoration);
    })

    it('persists when called from other modules', function() {
        var other_mod = require('./other_module');
        other_mod();
        assert.equal('OTHER_PERM', Permissions.roles('OTHER_ROLE').permissions[0]);
    });


 

});

describe('Retrieving user roles and permissions', function() {
    before(function() {
        Permissions.roles('ROLE1', {roles: [], permissions: ['PERM1']});
        Permissions.roles('ROLE2', {roles: [], permissions: ['PERM2']});
        Permissions.roles('NEST1', {roles: ['NEST2'], permissions: ['PERM2']});
        Permissions.roles('NEST2', {roles: [], permissions: ['PERM2']});
        Permissions.roles('DEC1:', {roles: [], permissions: ['PERM1', 'PERM2:']});
        Permissions.roles('DEC2', {roles: ['DEC1:'], permissions: []});
        Permissions.roles('DEC3', {roles: ['DEC1', 'DEC2'], permissions: []});
        Permissions.roles('DEC4:', {roles: ['DEC1:SNAIL', 'DEC1:'], permissions: []});
        Permissions.roles('DEC5', {roles: ['DEC1']});
        Permissions.roles('CIRC1', {roles: ['CIRC2'], permissions: ['PERM1']});
        Permissions.roles('CIRC2', {roles: ['CIRC1'], permissions: ['PERM1']});

    });


    it('retrieves a simple list of user roles', function() {
        // Permissions.roles('ROLE1', {roles: [], permissions: ['PERM1']);
        // Permissions.roles('ROLE2', {roles: [], permissions: ['PERM2']);
        var user = {
            roles: ['ROLE1', 'ROLE2']
        };
        var roles = Permissions.getUserRoles(user);
        assert.sameSet(['ROLE1', 'ROLE2'], roles);
    });

    it('retrieves a list of nested user roles', function() {
        // Permissions.roles('NEST1', {roles: ['NEST2'], permissions: ['PERM2']);
        // Permissions.roles('NEST2', {roles: [], permissions: ['PERM2']);
        var user = { roles: ['NEST1'] };
        var roles = Permissions.getUserRoles(user);
        assert.sameSet(['NEST1', 'NEST2'], roles);
    });

    it('retrieves a nested list of user roles, properly decorated', function() {
        // Permissions.roles('DEC1:', {roles: [], permissions: ['PERM1', 'PERM2:']);
        // Permissions.roles('DEC2', {roles: ['DEC1:'], permissions: []});
        // Permissions.roles('DEC3', {roles: ['DEC1', 'DEC2'], permissions: []});
        var user1 = { roles: ['DEC1:OK']};
        var user2 = { roles: ['DEC2:OK']};
        var user3 = { roles: ['DEC3:OK']};
        var roles1 = Permissions.getUserRoles(user1);
        var roles2 = Permissions.getUserRoles(user2);
        var roles3 = Permissions.getUserRoles(user3);
        assert.sameSet(['DEC1:OK'], roles1);
        assert.sameSet(['DEC2:OK', 'DEC1:OK'], roles2);
        assert.sameSet(['DEC3:OK', 'DEC2'], roles3);
    });

    it('ignores undecorated roles when decoration is required', function() {
        // Permissions.roles('DEC1:', {roles: [], permissions: ['PERM1', 'PERM2:']);
        // Permissions.roles('DEC2', {roles: ['DEC1:'], permissions: []});
        // Permissions.roles('DEC3', {roles: ['DEC1', 'DEC2'], permissions: []});
        var user1 = { roles: ['DEC1']};
        var user2 = { roles: ['DEC2']};
        var user3 = { roles: ['DEC3']};
        var roles1 = Permissions.getUserRoles(user1);
        var roles2 = Permissions.getUserRoles(user2);
        var roles3 = Permissions.getUserRoles(user3);
        assert.equal(roles1.length, 0);
        assert.sameSet(['DEC2'], roles2);
        assert.sameSet(['DEC3', 'DEC2'], roles3);
    })

    it('retrieves a simple list of user permissions', function() {
        // Permissions.roles('ROLE1', {roles: [], permissions: ['PERM1']);
        var user = { roles: ['ROLE1'], permissions: ['CUSTOM1']};
        var permissions = Permissions.getUserPermissions(user);
        assert.sameSet(['PERM1', 'CUSTOM1'], permissions);
    });

    it('decorates permissions requiring decoration while leaving others undecorated', function() {
        // Permissions.roles('DEC1:', {roles: [], permissions: ['PERM1', 'PERM2:']);
        var user = {roles: ['DEC1:OK'], permissions: []};
        var permissions = Permissions.getUserPermissions(user);
        assert.sameSet(['PERM1', 'PERM2:OK'], permissions)
    });

    it('cascades decorations through nested roles to permissions', function() {
        // Permissions.roles('DEC1:', {roles: [], permissions: ['PERM1', 'PERM2:']);
        // Permissions.roles('DEC4:', {roles: ['DEC1:SNAIL', 'DEC1:'], permissions: [])
        var user = {roles: ['DEC4:OK']};
        var permissions = Permissions.getUserPermissions(user);
        assert.sameSet(['PERM1', 'PERM2:SNAIL', 'PERM2:OK'], permissions);
    });

    // it('cascades `*` when undecorated', function() {
    //     // Permissions.roles('DEC1:', {roles: [], permissions: ['PERM1', 'PERM2:']);
    //     // Permissions.roles('DEC5', {roles: ['DEC1']})
    //     var user = {roles: ['DEC5']};
    //     var roles = Permissions.getUserRoles(user);
    //     var permissions = Permissions.getUserPermissions(user);
    //     assert.sameSet(['DEC5', 'DEC1:*'], roles);
    //     assert.sameSet(['PERM1', 'PERM2:*'], permissions);
    // });

    it('avoids getting in an infinite loop of roles', function(done) {
        // Permissions.roles('CIRC1', {roles: ['CIRC2'], permissions: ['PERM1']});
        // Permissions.roles('CIRC2', {roles: ['CIRC1'], permissions: ['PERM1']});
        var roles;

        // Assume an infinite loop if it takes longer than 500ms
        setTimeout(function() {
            assert.equal(2, roles.length)
            done();
        }, 500);

        roles = Permissions.getNestedRoles('CIRC1');
    });

});


describe('Matching Rules', function() {
    var user;

    before(function() {
        Permissions.clearRoles();
        Permissions.roles('KEY1', {});
        Permissions.roles('KEY2', {});
        Permissions.roles('KEY3', {});
        user = {
            roles: [
                'KEY1:DECOR',
                'KEY2',
                'KEY3:*'
            ]
        }
    });

    after(function() {
        Permissions.clearRoles();
    });

    it('simple role matching KEY:DECOR and KEY:DECOR', function() {
        assert.ok(Permissions.userHasRole(user, 'KEY1:DECOR'));
    });

    it('applies proper scoping when matching decorated and undecorated roles', function() {
        assert.equal(false, Permissions.userHasRole(user, 'KEY1'));
        assert.equal(true, Permissions.userHasRole(user, 'KEY2:DECOR'));
    });

    it('applies KEY and KEY:* always match', function() {
        assert.equal(true, Permissions.userHasRole(user, 'KEY1:*', 'Failed mating KEY1:*'));
        assert.equal(true, Permissions.userHasRole(user, 'KEY2', 'Failed mating KEY2'));
        assert.equal(true, Permissions.userHasRole(user, 'KEY3', 'Failed mating KEY3'));
        assert.equal(true, Permissions.userHasRole(user, 'KEY3:DECOR', 'Failed mating KEY3:DECOR'));
    });


    
});
