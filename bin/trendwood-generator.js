#!/usr/bin/env node

var program = require('commander');
var mkdirp = require('mkdirp');
var os = require('os');
var fs = require('fs');
var path = require('path');
var readline = require('readline');
var sortedObject = require('sorted-object');
var fse = require('fs-extra');

var _exit = process.exit;
var eol = os.EOL;
var pkg = require('../package.json');

var version = pkg.version;

// Re-assign process.exit because of commander
// TODO: Switch to a different command framework
process.exit = exit

// CLI

before(program, 'outputHelp', function() {
  this.allowUnknownOption();
});

program
  .version(version)
  .usage('[options] [dir]')
  .option('-e, --ejs', 'add ejs engine support (defaults to jade)')
  .option('    --hbs', 'add handlebars engine support')
  .option('-f, --force', 'force on non-empty directory')
  .parse(process.argv);

if (!exit.exited) {
  main();
}

/**
 * Install a before function; AOP.
 */

function before(obj, method, fn) {
  var old = obj[method];

  obj[method] = function() {
    fn.call(this);
    old.apply(this, arguments);
  };
}

/**
 * Prompt for confirmation on STDOUT/STDIN
 */

function confirm(msg, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(msg, function(input) {
    rl.close();
    callback(/^y|yes|ok|true$/i.test(input));
  });
}



/**
 * 递归读取目录所有文件名
 */
function readDirResuir(dir) {
  var results = [];

  function readDir(dir) {
    console.log(dir);
    var files = fs.readdirSync(dir);

    files.forEach(function(item, index) {
      var filePath = path.join(dir, item);
      if (fs.statSync(filePath).isDirectory()) {
        return readDir(filePath);
      }
      results.push(filePath);
    });
  }

  readDir(dir);

  return results;
}

function ForceWrite(file_name, to_path) {
  to_path = path.resolve(to_path);
  var file_content = fs.readFileSync(file_name, 'utf8');
  var stat = fs.stat(to_path, function(err, stat) {
    if (err.code === 'ENOENT') {
      var parent_path = path.join(to_path, '..');
      mkdir(parent_path);
      return fs.writeFileSync(to_path, file_content, 'utf8');
    }
    fs.writeFileSync(to_path, file_content, 'utf8');
  });
}


/**
 * 切换模版
 */
function switchTemplate(path_name, template) {

  var package_path = path.join(path_name, 'package.json');
  fs.readFile(package_path, 'utf8', function(err, data) {
    if (err) throw err;
    var result = '';
    switch (template) {
      case 'jade':
        result = data.replace(/{template}/, template);
        result = result.replace(/{version}/, '~1.11.0');
        break;
      case 'ejs':
        result = data.replace(/{template}/, template);
        result = result.replace(/{version}/, '~2.3.3"');
        break;
      case 'hbs':
        result = data.replace(/{template}/, template);
        result = result.replace(/{version}/, '~3.1.0');
        break;
    }
    fs.writeFileSync(package_path, result);
  });

  var express_path = path.join(path_name, 'config/express.js');
  fs.readFile(express_path, 'utf8', function(err, data) {
    if (err) throw err;
    var result = data.replace(/{template}/, template);
    fs.writeFileSync(express_path, result);
  });

  var src_path = path.join(__dirname, '../templates-views', template);
  var views_path = path.join(path_name, 'app/views');
  fse.copySync(src_path, views_path);
}

/**
 * Create application at the given directory `path`.
 *
 * @param {String} path
 */

function createApplication(app_name, path_name) {


  function complete() {
    var prompt = launchedFromCmd() ? '>' : '$';

    console.log();
    console.log('   install dependencies:');
    console.log('     %s cd %s && npm install', prompt, path_name);
    console.log();
    console.log('   run the app:');

    if (launchedFromCmd()) {
      console.log('     %s SET DEBUG=%s:* & npm start', prompt, app_name);
    } else {
      console.log('     %s DEBUG=%s:* npm start', prompt, app_name);
    }

    console.log();
  }




  var src = path.join(__dirname, '../templates');

  fse.copy(src, path_name, function(err) {
    if (err) return console.log(err);



    // package.json
    var pkg = {
      name: app_name,
      version: '0.0.1',
      private: false,
      scripts: {
        "start": "NODE_ENV=development ./node_modules/.bin/nodemon server.js",
        "debug": "NODE_ENV=development ./node_modules/.bin/nodemon --debug server.js",
        "test": "NODE_ENV=test ./node_modules/.bin/ava --serial test/test-*.js"
      },
      dependencies: {
        "body-parser": "~1.14.1",
        "co-express": "~1.2.1",
        "compression": "~1.6.0",
        "connect-flash": "~0.1.1",
        "connect-mongo": "~0.8.2",
        "cookie-parser": "~1.4.0",
        "cookie-session": "~1.2.0",
        "csurf": "~1.8.3",
        "express": "~4.13.3",
        "express-session": "~1.12.1",
        "forever": "~0.15.1",
        "method-override": "~2.3.5",
        "mongoose": "~4.2.7",
        "morgan": "~1.6.1",
        "multer": "~1.1.0",
        "notifier": "~0.1.7",
        "object-assign": "~4.0.1",
        "only": "0.0.2",
        "passport": "~0.3.2",
        "passport-facebook": "~2.0.0",
        "passport-github": "~1.0.0",
        "passport-google-oauth": "~0.2.0",
        "passport-linkedin": "~1.0.0",
        "passport-local": "~1.0.0",
        "passport-twitter": "~1.0.3",
        "view-helpers": "~0.1.5",
        "winston": "~2.1.1",
        "{template}": "{version}"
      },
      devDependencies: {
        "ava": "~0.6.0",
        "nodemon": "*",
        "supertest": "*"
      }
    };

    fs.writeFileSync(path.join(path_name, 'package.json'), JSON.stringify(pkg, null, 2));





    switchTemplate(path_name, program.template);
    console.log('   success!');
  });


  complete();
}

function copy_template(from, to) {
  from = path.join(__dirname, '..', 'templates', from);
  write(to, fs.readFileSync(from, 'utf8'));
}

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */

function emptyDirectory(path, fn) {
  fs.readdir(path, function(err, files) {
    if (err && 'ENOENT' != err.code) throw err;
    fn(!files || !files.length);
  });
}

/**
 * Graceful exit for async STDIO
 */

function exit(code) {
  // flush output for Node.js Windows pipe bug
  // https://github.com/joyent/node/issues/6247 is just one bug example
  // https://github.com/visionmedia/mocha/issues/333 has a good discussion
  function done() {
    if (!(draining--)) _exit(code);
  }

  var draining = 0;
  var streams = [process.stdout, process.stderr];

  exit.exited = true;

  streams.forEach(function(stream) {
    // submit empty write request and wait for completion
    draining += 1;
    stream.write('', done);
  });

  done();
}

/**
 * Determine if launched from cmd.exe
 */

function launchedFromCmd() {
  return process.platform === 'win32' && process.env._ === undefined;
}

/**
 * Load template file.
 */

function loadTemplate(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'templates', name), 'utf-8');
}

/**
 * Main program.
 */

function main() {
  // Path
  var destinationPath = program.args.shift() || '.';

  // App name
  var appName = path.basename(path.resolve(destinationPath));

  // Template engine
  program.template = 'jade';
  if (program.ejs) program.template = 'ejs';
  if (program.hogan) program.template = 'hjs';
  if (program.hbs) program.template = 'hbs';

  // Generate application
  emptyDirectory(destinationPath, function(empty) {
    if (empty || program.force) {
      createApplication(appName, destinationPath);
    } else {
      confirm('destination is not empty, continue? [y/N] ', function(ok) {
        if (ok) {
          process.stdin.destroy();
          createApplication(appName, destinationPath);
        } else {
          console.error('aborting');
          exit(1);
        }
      });
    }
  });
}

/**
 * echo str > path.
 *
 * @param {String} path
 * @param {String} str
 */

function write(path, str) {
  fs.writeFileSync(path, str);
  console.log('   \x1b[36mcreate\x1b[0m : ' + path);
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */

function mkdir(path, fn) {
  mkdirp(path, function(err) {
    if (err) throw err;
    console.log('   \033[36mcreate\033[0m : ' + path);
    fn && fn();
  });
}