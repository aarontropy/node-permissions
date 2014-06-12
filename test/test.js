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

var roleSchemes = {
    'TEST1:': {
        roles: [
        ],
        permissions: [
            'PERM1-1:',
            'PERM1-2'
        ]
    },
    'TEST2': {
        roles: [
        ],
        permissions: [
            'PERM2-1',
            'PERM2-2'
        ]
    },
    'SUPER': {
        roles: [
            'TEST1:*',
            'TEST2'
        ],
        permissions: [
            'DOALL'
        ]
    },
    'CIRC1': {
        roles: ['CIRC2'],
        permissions: ['PERM1']
    },
    'CIRC2': {
        roles: ['CIRC1'],
        permissions: ['PERM2']
    },
    'SYSADMIN': {
        roles: [
            'ADMIN',
            'USER:*',
            'ORGADMIN:*'
        ],
        permissions: [
            'ASSIGN_ROLE'
        ]
    },

    'ADMIN': {
        roles: [
        ],
        permissions: [
            'ADD_USER'
        ]
    },

    'USER:': {
        roles: [
        ],
        permissions: [
            'VIEW_USER_PROFILE:',
            'EDIT_USER_PROFILE:'
        ]
    },

    'ORGADMIN:': {
        roles: [
        ],
        permissions: [
            'EDIT_ORG:'
        ]
    }
};


describe('Permissions', function() {
    var permissions = new Permissions(roleSchemes);

    // it('Correctly extracts arguments from roleperm', function() {
    //     var args = permissions.getDecorations('ROLE:ARG1:ARG2');
    //     assert.deepEqual(args, ['ARG1', 'ARG2']);
    // });

    // it('returns no arguments if none are passed', function() {
    //     var args = permissions.getDecorations('ROLE');
    //     assert.equal(args.length, 0);
    // });

    it('returns the correct role scheme', function() {
        assert.deepEqual(permissions.getRoleScheme('TEST1'), roleSchemes['TEST1:']);
        assert.deepEqual(permissions.getRoleScheme('TEST1:*'), roleSchemes['TEST1:']);
    });
    
    it('decorates permissions based on the role', function() {
        var perms;

        perms = permissions.getRolePermissions('TEST1:test');
        assert.deepEqual(['PERM1-1:test', 'PERM1-2'], perms);

        perms = permissions.getRolePermissions('TEST2');
        assert.sameSet(['PERM2-2','PERM2-1'], perms);
        // assert.ok(perms.sameSet(['PERM2-2','PERM2-1']), perms + " sameSet " + ['PERM2-2','PERM2-1'])
    });

    it('gets and decorates permissions from nested roles', function() {
        var perms;

        perms = permissions.getRolePermissions('SUPER');
        assert.sameSet(['PERM1-1:*', 'PERM1-2', 'PERM2-1','PERM2-2', 'DOALL'], perms);
    });



    it('avoids getting in an infinite loop of roles', function(done) {
        var perms;

        // Assume an infinite loop if it takes longer than 500ms
        setTimeout(function() {
            assert.sameSet(['PERM1', 'PERM2'], perms);
            done();
        }, 500);
        
        perms = permissions.getRolePermissions('CIRC1');
    });

    
    it('gets all the permissions for a user', function() {
        var user = {
            roles: ['TEST2', 'CIRC1'],
            permissions: ['WEIRD_ROLE']
        };

        var perms = permissions.getUserPermissions(user);
        assert.sameSet(['PERM2-1', 'PERM2-2', 'PERM1', 'PERM2', 'WEIRD_ROLE'], perms);
    });


})