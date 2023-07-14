# Hizzy

Hizzy is a React based modern web framework!

# Installation

All you have to do is open a terminal in the directory of your project and type:

```
npx hizzy
```

<!-- TOC -->
* [Hizzy](#hizzy)
* [Installation](#installation)
* [Production Configuration](#production-configuration)
* [Built-in addons](#built-in-addons)
  * [@hizzy/database](#hizzydatabase)
    * [SQLite Support](#sqlite-support)
    * [MongoDB Support](#mongodb-support)
    * [MySQL Support](#mysql-support)
    * [JSON Database Support](#json-database-support)
    * [YAML Database Support](#yaml-database-support)
    * [XML Support](#xml-support)
  * [@hizzy/language](#hizzylanguage)
  * [@hizzy/authentication](#hizzyauthentication)
  * [@hizzy/error-overlay](#hizzyerror-overlay)
* [🏎️ Blazingly fast and small-sized! 🏎️](#-blazingly-fast-and-small-sized-)
  * [Statistics](#statistics)
* [JSX Support](#jsx-support)
* [⚡ Instant server connection! ⚡](#-instant-server-connection-)
  * [@server](#server)
  * [@server/respond](#serverrespond)
    * [You might ask, why do I have to use `await` keyword for `@server/respond` functions?](#you-might-ask-why-do-i-have-to-use-await-keyword-for-serverrespond-functions)
  * [@server/join & @server/leave](#serverjoin--serverleave)
  * [@server/start](#serverstart)
    * [NOTE: This doesn't work when the development mode is on!](#note-this-doesnt-work-when-the-development-mode-is-on)
      * [*Reason for the note: The @server/start runs when the server starts which is possible when it's production mode](#reason-for-the-note-the-serverstart-runs-when-the-server-starts-which-is-possible-when-its-production-mode)
* [CLI](#cli)
  * [Providing the cd](#providing-the-cd)
    * [Example:](#example)
  * [Other options](#other-options)
    * [-h or --help](#-h-or---help)
    * [-v or --version](#-v-or---version)
    * [-av or --advanced-version](#-av-or---advanced-version)
    * [-b or --build](#-b-or---build)
    * [--host](#--host)
    * [--port=PORT](#--portport)
    * [--dev](#--dev)
    * [--auto-build](#--auto-build)
    * [--debug](#--debug)
    * [--debug-socket](#--debug-socket)
    * [--experimental](#--experimental)
* [Addon API](#addon-api)
  * [onLoad()](#onload)
  * [onEnable()](#onenable)
  * [onDisable()](#ondisable)
  * [onClientSideLoad()](#onclientsideload)
  * [onClientSideRendered()](#onclientsiderendered)
  * [onClientSideError()](#onclientsideerror)
* [Why Hizzy?](#why-hizzy)
* [When did Hizzy born, actually?](#when-did-hizzy-born-actually)
<!-- TOC -->

# Production Configuration

You might want to turn off `includeOriginalInBuild` for faster build scan.

You might want to turn off `autoBuild` to prevent it from rebuilding every time.

You should turn `dev` off by setting it to `false`.

# Built-in addons

## @hizzy/database

This addon adds these databases:

### SQLite Support

### MongoDB Support

### MySQL Support

### JSON Database Support

### YAML Database Support

### XML Support

## @hizzy/language

This addon adds language support to your page!

## @hizzy/authentication

### Local authentication

Check the [Local Authentication Example on Github](https://github.com/OguzhanUmutlu/hizzy/tree/main/examples/local-auth)

### Discord authentication

Check the [Discord Authentication Example on Github](https://github.com/OguzhanUmutlu/hizzy/tree/main/examples/discord-auth)

## @hizzy/error-overlay

An addon that makes a popup for errors whenever something doesn't work which helps you maintain your project easily!

# 🏎️ Blazingly fast and small-sized! 🏎️

Hizzy is blazingly fast compared to its competitors!

## Statistics

Coming soon...

# JSX Support

You can use JSX which lets you add HTML/Components inside your code!

# ⚡ Instant server connection! ⚡

There are comment decorators in Hizzy that allow you to run specific server-sided functions you want to run!

## @server

The `@server` decorator lets client run a function that is run in the server side!

An example that logs "Hello, world!" to the server terminal whenever a button is pressed:

```jsx
// @server
function helloWorld() {
    console.log("Hello, world!");
}

export default <button onClick={helloWorld}></button>
```

And you might be asking yourself... Can't the client see the inside of the server-sided function then?

No! Only thing the client knows is that the server-sided function is called helloWorld! How amazing is that!?

## @server/respond

The `@server/respond` decorator lets client run a function that is run in the server side and get the returned value!

An example that adds two numbers and sends them back to the client:

```jsx
// @server/respond
function secretFunction(a, b) {
    // Client doesn't know that it's just addition!
    return a + b;
}

export default <div>The secret function says {await secretFunction(2, 2)}</div>;
```

### You might ask, why do I have to use `await` keyword for `@server/respond` functions?

The reason is it's not instant in literal sense. Since it uses sockets to run functions, it takes little to no time.
But it can't be instant.

## @server/join & @server/leave

The `@server/join` decorator will be run when a client joins. The function will be executed from the server side.

The `@server/leave` decorator will be run when a client leaves. The function will be executed from the server side.

The clients won't get any information about the functions assigned with these decorators. Not even their names.

An example that tells the server terminal that someone joined or left:

```jsx
// @server/join
function onSomeoneJoin() {
    console.log("Someone just joined!");
}

// @server/leave
function onSomeoneLeave() {
    console.log("Someone just left!");
}

export default <div>What a peaceful page!</div>;
```

## @server/start

The functions assigned with `@server/start` decorator will be run from server side and will run at the beginning of the
process.

The clients won't get any information about the functions assigned with this decorator. Not even their names.

An example that logs `I'm alive` to the server terminal when server starts:

```jsx
// @server/start
function onServerStart() {
    console.log("I'm alive!");
}

export default <div>Hey!</div>;
```

### NOTE: This doesn't work when the development mode is on!

#### *Reason for the note: The @server/start runs when the server starts which is possible when it's production mode

since every file is built once per process. Unlike production mode, in development mode the files will be built every
request, therefore it would have to run the @server/start function every REQUEST! That is usually not what you want. So
we disabled it. It will say `Internal server error` to the client.*

# CLI

All you have to do to is type `hizzy`!

This will immediately start your project.

## Providing the cd

Normally `hizzy` uses the current directory you are in the terminal,
but you can specify the directory as an argument!

```
hizzy [root]
```

### Example:

```
hizzy ./myDirectory/myProject
```

## Other options

### -h or --help

Shows a list of options and usages.

Doesn't run anything related to project.

### -v or --version

Shows the version of the hizzy.

Doesn't run anything related to project.

### -av or --advanced-version

Shows an advanced list of versions you might need for creating an [Issue](https://github.com/OguzhanUmutlu/Hizzy/issues)
on Hizzy.

Sends the version of:

- Hizzy
- Node
- Device

Doesn't run anything related to project.

### -b or --build

Builds the project.

Doesn't; scan the build, listen the server or run the main file.

### --host

Exposes the IPv4 address in the start screen. (or `u` shortcut)

### --port=PORT

Sets the port.

If the port is 0, it will pick a random open port.

### --dev

Enables developer mode. (Can be set to `"dev": true` in the `hizzy.json`)

### --auto-build

Builds even if `autoBuild` is set to `false` in the `hizzy.json`.

### --debug

Sends the debug messages. (Can be set to `"debug": true` in the `hizzy.json`)

### --debug-socket

Shows the packets sent to sockets in the terminal. Requires the `debug` mode to be on.

### --experimental

This minifies the following files in the source files of Hizzy:

- /injections/html.js
- /injections/jsx.js

Which prevents unnecessary building for some files.

Enabling this won't break anything, it will only slow down the initial time approximately 200ms depending on your
device.

# Addon API

To create an addon structure you can run the command `npx hizzy --addon-init YourAddonName`

## onLoad()

This function is ran immediately after the file is exported.

## onEnable()

This function is ran when the addon is enabled.

First trigger of this function is when server starts listening.

This can be triggered by the `a` shortcut in the CLI which disables and enables all addons.

## onDisable()

This function is ran when the addon is enabled.

This can be triggered by the `a` shortcut in the CLI which disables and enables all addons.

This will be triggered before the termination of the process.

## onClientSideLoad()

This function is ran when a client joins the website.

**WARNING: This function will be run from the client side therefore you can't use server-sided functions.**

For more information check the `injections/jsx.js` file and search for `doAddon(1)`.

NOTE: If the client is transferred between pages using Hizzy's `openPage` function or `reloadPage` this won't be run
again.
This function is only ran when the first request is sent.

## onClientSideRendered()

This function is ran when a client has done rendering the page.

**WARNING: This function will be run from the client side therefore you can't use server-sided functions.**

For more information check the `injections/jsx.js` file and search for `doAddon(2)`.

## onClientSideError()

This function is ran when a client has done rendering the page.

**WARNING: This function will be run from the client side therefore you can't use server-sided functions.**

For more information check the `injections/jsx.js` file and search for `doAddon(3)`.

# Why Hizzy?

In Turkish "hız" means "speed" in English. We added "zy" at the end to make it easier to pronounce and here you go,
Hizzy!

People who helped to find the name: mattmatt0990, lebouwski

# When did Hizzy born, actually?

- June 21st 2023 1:24 PM