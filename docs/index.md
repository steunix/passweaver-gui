# About

Vaulted-gui is standalone WEB interface to Vaulted-API, bringing collaborative enterprise-scale password management to your browser. It's developed using mainly NodeJS, Express and EJS, and uses Boostrap for UI styling.

Vaulted-gui is an opensource project, released under MIT license.

# Features

- Personal folders
- Share items through permalinks
- Pages are served with HTTPS, HTTP/2 and optionally HTTP (with limitations, see below)
- CSP compliant pages
- Both LDAP and local authentication
- Quick user interface

# Forewords

Vaulted-gui is just a nice frontend to vaulted-api and it brings all its capabilities to the final user; everything you can do with your items, folders, users and groups is defined in vaulted-api. See docs there for more info about its capabilities.

While vaulted-api is a generic and independent piece of software, vaulted-gui is its perfect companion.

# Basics

With vaulted-gui you will manage these entities:

- Users
- Groups
- Folders
- Items, holding your secret data

Items are stored in folders, and folders can contain both items and other folders. Users join groups (one or more), and groups can read or write on a given folder, its items and subfolders.

## Items menu

This is the items page:

![Items page](/vaulted-gui/docs/assets/vaultedgui-item.jpeg)

## Users

## Groups

## Folders

## Items