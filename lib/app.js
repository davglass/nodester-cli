var node = require('nodester-api').nodester,
    config = require('./config'),
    log = require('./log'),
    util = require('util'),
    exec = require('child_process').exec,
    fs = require('fs');


module.exports = {
    usage: function() {
        log.usage('app or <appname> is not required if inside an app directory after you call setup');
        log.usage('app setup <appname> - Configure this app for future app commands');
        log.usage('app info <appname> - Returns app specific information');
        log.usage('app logs <appname> - Returns app logs');
        log.usage('app stop|start|restart <appname> - Controls app status.');
        log.usage('app create <appname> <startfile> - Creates a new app named <appname>, <startfile> is optional.');
        log.usage('app delete <appname> - Deletes the app.');
        log.usage('app gitreset <appname> - Resets the app to git HEAD (in case you want a clean restart).');
        log.usage('app init <appname> - Fetches the remote repo and sets it up.');
        log.usage('app clone <appname> - Fetches the remote repo.');
    },
    setup: function(args) {
        if (!args.length) {
            log.error('appname required');
        }
        config.writeApp(args[0]);
    },
    info: function(args) {
        config.check();
        var appname = config.appname;
        if (args.length) {
            appname = args[0].toLowerCase();
        }
        log.info('Gathering information about:', appname);
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_info(appname, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            var l = 'info', r = data.running;
            if (data.running == false || data.running.indexOf('error') > -1 || data.running.indexOf('failed-to-stop') > -1) {
                l = 'warn';
                if (r === false) {
                    r = 'false'
                }
                r = r.red;
            }
            var pid = '';
            if (data.pid) {
                pid = '(pid: ' + data.pid + ')';
            }
            log[l](appname, 'on port', data.port, 'running:', r.bold, pid);
            log.info('gitrepo:', data.gitrepo);
            log.info('appfile:', data.start);
        });
    },
    logs: function(args) {
        config.check();
        var appname = config.appname;
        if (args.length) {
            appname = args[0].toLowerCase();
        }
        
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_logs(appname, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            if (data.lines && data.lines.length && data.lines[0] !== '') {
                log.info('Showing logs for:', appname);
                data.lines.forEach(function(l) {
                    log.plain(l);
                });
            } else {
                log.warn('no log data returned.');
            }
        });
    
    },
    stop: function(args) {
        config.check();
        var appname = config.appname;
        if (args.length) {
            appname = args[0].toLowerCase();
        }
        log.info('Attemping to stop app:', appname);
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_stop(appname, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            if (data.status == "success") {
                log.info('app stopped.');
            } else {
                log.warn(data.status);
            }
        });
    },
    start: function(args) {
        config.check();
        var appname = config.appname;
        if (args.length) {
            appname = args[0].toLowerCase();
        }
        log.info('Attemping to start app:', appname);
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_start(appname, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            if (data.status == "success") {
                log.info('app started.'.bold.green);
            } else {
                log.warn(data.status);
            }
        });
    },
    restart: function(args) {
        config.check();
        var appname = config.appname;
        if (args.length) {
            appname = args[0].toLowerCase();
        }
        log.info('Attemping to restart app:', appname);
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_restart(appname, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            if (data.status == "success") {
                log.info('app restarted.'.bold.green);
            } else {
                log.warn(data.status);
            }
        });
    },
    gitreset: function(args) {
        config.check();
        var appname = config.appname;
        if (args.length) {
            var appname = args[0].toLowerCase();
        }
        log.warn('resetting app:', appname);
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_gitreset(appname, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            if (data.status == "success") {
                log.warn('successfully reset app', appname.bold);
            } else {
                log.error(data.status);
            }
        });
    },
    delete: function(args) {
        config.check();
        var appname = config.appname;
        if (args.length) {
            var appname = args[0].toLowerCase();
        }
        log.warn('deleting app:', appname);
        log.warn('Are you sure you want to do this?');
        log.plain('     Waiting 10 seconds before continuing, Ctrl+C to abort)');
        util.print('.');
        var timer = setInterval(function() {
            util.print('.');
        }, 1000);
        setTimeout(function() {
            clearInterval(timer);
            util.print('\n');
            log.warn('Really deleting app now, you were warned..');
            var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
            nodeapi.app_delete(appname, function (err, data) {
                if (err) {
                    log.error(err.message);
                }
                if (data.status == "success") {
                    log.warn('successfully deleted app', appname.bold);
                } else {
                    log.error(data.status);
                }
            });
        }, 10000);
    },
    create: function(args) {
        config.check();
        if (!args.length) {
            log.error('give this app a name');
        }
        var name = args[0].toLowerCase();
        var start = args[1] || 'server.js';
        log.info('creating app:', name, start);
        
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_create(name, start, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            if (data.status == "success") {
                log.info('successfully created app', name.bold, 'to will run on port', ((data.port) + '').bold, 'from', start.bold);
                log.info('run', (config.brand + ' app init ' + name).yellow.bold, 'to setup this app.');
            } else {
                log.error(data.status);
            }
        });
    },
    init: function(args) {
        config.check();
        if (args.length) {
            var appname = folder = args[0].toLowerCase();
            if (args[1]) {
                folder = args[1].toLowerCase();
            }
        }
        log.info('initializing git repo for', appname, 'into folder', folder);
        try {
            fs.mkdirSync(folder, 0750);
        } catch (e) {
            log.error(e.toString());
        }
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_info(appname, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            log.info('cloning the repo', 'git clone ' + data.gitrepo + ' ' + folder);
            var child = exec('git clone ' + data.gitrepo + ' ' + folder, function (error, stdout, stderr) {
                log.info('clone complete');
                var rcfile = config.writeApp(appname, folder);
                log.info('writing app files');
                fs.writeFileSync(folder + '/.gitignore', rcfile + "\n");

                fs.writeFileSync(folder + '/' + data.start,
                    "var http = require('http');\n" +
                    "http.createServer(function (req, res) {\n" +
                    "  res.writeHead(200, {'Content-Type': 'text/plain'});\n" +
                    "  res.end('Hello World\\nApp (" + appname + ") is running..');\n" +
                    "}).listen(" + data.port + ");\n"
                );
                var cmd = 'cd ' + folder + '; git add ' + data.start + ' .gitignore; git commit -am "Initial commit via ' + config.brand + '-cli"; git push origin master;';
                log.info('processing the initial commit');
                var child2 = exec(cmd, function (error, stdout, stderr) {
                    process.cwd(folder);
                    log.info('attemping to start the new app.');
                    nodeapi.app_start(appname, function (err, data) {
                        if (err) {
                            log.error(err.message);
                        }
                        if (data.status == "success") {
                            log.info(appname, "started.");
                            log.info('Some helpful app commands:\n');
                            log.plain('     cd ./' + folder);
                            log.plain('     ', (config.brand + ' app info').yellow);
                            log.plain('     ', (config.brand + ' app logs').yellow);
                            log.plain('     ', (config.brand + ' app stop|start|restart').yellow);
                          } else {
                            if (data && data.status) {
                                log.warn(data.status);
                            }
                          }
                    });
                });
            });
        });
    },
    clone: function(args) {
        config.check();
        if (args.length) {
            var appname = folder = args[0].toLowerCase();
            if (args[1]) {
                folder = args[1].toLowerCase();
            }
        }
        log.info('initializing git repo for', appname, 'into folder', folder);
        try {
            fs.mkdirSync(folder, 0750);
        } catch (e) {
            log.error(e.toString());
        }
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_info(appname, function (err, data) {
            if (err) {
                log.error(err.message);
            }
            log.info('cloning the repo', 'git clone ' + data.gitrepo + ' ' + folder);
            var child = exec('git clone ' + data.gitrepo + ' ' + folder, function (error, stdout, stderr) {
                var rcfile = config.writeApp(appname, folder);
                fs.writeFileSync(folder + '/.gitignore', rcfile + "\n");
            });
        });

    },
    simulate: function(args) {
        var path = require('path');
        var https = require('https');
        config.check();
        var appname = process.nodester.appname;
        if (args.length) {
            var appname = args[0].toLowerCase();
        }
        log.info('simulating nodester chroot locally for:', appname);
        try {
            require('daemon');
        } catch (e) {
            log.error('daemon npm package required: ', 'npm install daemon'.white.bold);
        }
        var nodeapi = new node(config.username, config.password, config.apihost, config.apisecure);
        nodeapi.app_info(appname, function (err, data) {
            var app_home = process.cwd();
            var configData = {
                appdir: '.',
                userid: process.getuid(process.env.USER),
                apphome: app_home,
                start: data.start,
                port: data.port,
                ip: '127.0.0.1',
                name: appname
            };
            if (!path.existsSync(path.join(app_home, '.nodester'))) {
                log.warn('making directories, you should add', '.nodester'.white, 'and', 'etc'.white, 'to your', '.gitignore'.yellow, 'file');
                fs.mkdirSync(path.join(app_home, '.nodester'), 0777);
                fs.mkdirSync(path.join(app_home, '.nodester', 'logs'), 0777);
                fs.mkdirSync(path.join(app_home, '.nodester', 'pids'), 0777);
            }
            log.info('writing config data:', path.join(app_home, '.nodester', 'config.json').white);
            fs.writeFileSync(path.join(app_home, '.nodester', 'config.json'), JSON.stringify(configData), encoding='utf8');
            log.info('Fetching the latest', 'launch_chrooted_app.js'.white);
            var out_file = '/tmp/launch_chrooted_app.js';
            https.get({
                host: 'github.com',
                path: '/nodester/nodester/raw/master/scripts/launch_chrooted_app.js'
            }, function(res) {
                var data = '';
                res.on('data', function(d) {
                    data += d;
                });
                res.on('end', function() {
                    log.info('file fetched, saving to:', out_file.white);
                    fs.writeFileSync(out_file, data, encoding='utf8');
                    fs.chmodSync(out_file, 0777);
                    log.info('launching chroot, needs sudo access..');
                    exec('sudo ' + out_file, function() {
                        console.log(arguments);
                    });
                });
            });
        });
    }
}

