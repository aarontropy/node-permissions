node-permissions
================

node-permissions is a module that helps manage roles and permissions.

/**
  NAME1        Undecorated Role/Permission
  NAME2:       Partial Role/Permission
  NAME3:DEC    Decorated Role/Permission
 
# Decoration Inheritance
1.  Partial Permissions assigned to Role inherit the decoration of the Role
2.  Partial Permissions assigned to the User do not inherit decorations
3.  Partial Roles do no inherit decorations
 

# Defining a role schema
The schema for a role is an Object with two properties: `roles` and `permissions`
1. `roles` is an array of nested roles (each with their own schema) to be assigned along with the role. 
```javascript
wocket = {
	roles: ['Pocket_Dweller'],
	permissions: ['']
}
```
2. `permissions` is an array of permissions assigned to any user given the role.

In a schema, roles and permissions defined with a `:` at the end must be decorated when matched (ie. a role defined as 'ROLE:'...???)

## Decorating Roles and Permissions
* Roles and Permissions can be decorated by appending `:<decoration>` to the string
* Decorated roles and permissions are narrower in scope than their undecorated counterparts.
* A role decorated with `*` is equivalent to an undecorated role

When adding roles and permissions to a role schema, items endinging with `:` will be decorated with the parent role's decoration.  Items that do not end with `:` will not be decorated
 
Defining roles
 
# Matching
Matching involves the functions `userHasRole` and `userHasPermission`

Matching rules:
When using .userHasRole() and .userHasPermission(), the following rules apply:
1. KEY:DECOR and KEY:DECOR always match
2. KEY and KEY:DECOR never match
3. KEY and KEY:* always match
4. KEY:DECOR and KEY:* always match
