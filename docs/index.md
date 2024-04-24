# About

PassWeaver-gui is standalone WEB interface to PassWeaver-API, bringing collaborative enterprise-scale password management to your browser. It's developed using mainly NodeJS, Express and EJS, and uses Boostrap for UI styling.

PassWeaver-gui is an opensource project, released under MIT license.

# Features

- Personal folders
- Share items through permalinks
- Pages are served with HTTPS and optionally HTTP (with limitations, see below)
- CSP compliant pages
- Both LDAP and local authentication
- Quick user interface

# Forewords

PassWeaver-gui is just a nice frontend to PassWeaver-api and it brings all its capabilities to the final user; everything you can do with your items, folders, users and groups is defined in PassWeaver-api. See docs there for more info about its capabilities.

While PassWeaver-api is a generic and independent piece of software, PassWeaver-gui is its perfect companion.

# Basics

With PassWeaver-gui you will manage these entities:

- Users
- Groups
- Folders
- Items, holding your secret data

Items are stored in folders, and folders can contain both items and other folders. Users join groups (one or more), and groups can read or write on a given folder, its items and subfolders.

## Items menu

This is the items page:

![Items page](assets/passweavergui-items.jpeg)

In "Folders" pane you can create a subfolder, modify or delete a folder, if you have permission on it. You can also search for a folder and use the previous/next buttons to navigate the tree.

In "Items" pane you have a list of folder item, with the following actions, if you have proper permission:
- View item
- Edit item
- Delete item
- Clone item
- Copy link

You can also copy to clipboard both the username and the password. With the "Show" icon, you can toggle view/hide password for that single item.

This is the item details dialog:

![Item dialog](assets/passweavergui-item.jpeg)

## Search

In the "Search" page you can search items with a matching title or username. Just type a string to search for.

![Search page](assets/passweavergui-search.jpeg)

## Generator

![Generator page](assets/passweavergui-generator.jpeg)

## Folders

![Folders page](assets/passweavergui-folders.jpeg)

## Users

![Users page](assets/passweavergui-users.jpeg)

## Groups

![Groups page](assets/passweavergui-groups.jpeg)

## Stats

![Stats page](assets/passweavergui-stats.jpeg)
