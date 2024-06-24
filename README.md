# mbcvt
Millbrook Campground in Westfield Vermont

## Summary

This is a reservation system for Millbrook Campground in Westfield Vermont.  It is written in typescript.  The backend runs on Netlify and the database is FaunaDB.

## Requirements

The user must be able to reserve sites online and the experience must be better then https://www.reserveamerica.com/.

- User should be able to see a map of the campground and see which sites are available for which dates.
- User should be able to reserve a site for a given date range.
- User should be able to see a list of all reservations.
- User should be able to see a list of all sites.
- User should be able to cancel a reservation.
- User should be able to receive notifications about their reservation.

## Backend

The backend is written in typescript and runs on Netlify.  The database is FaunaDB.  The backend is a REST API.  The backend is deployed to Netlify using the netlify cli.

## Frontend

The frontend is written in typescript, no frameworks, no build tools, no compression, minimal logic, minimal UI.  The frontend is deployed to Netlify using the netlify cli.

## Payment Processing

I will use stripe for payment processing.  Stripe charges 1.75% + 30 cents per transaction.  For a $20 reservation, stripe will charge 68 cents.  For a $100 reservation strip will charge $2.05. I see no reason not to use this service.

Stripe also has a tap-to-pay phone app.  I will use this to accept payments in person.

## Development

- Create a mock Front End using TSC only
- Install the Netlify CLI
- Install the FaunaDB CLI
- Setup a FaunaDB database

### Digital Ocean

Install the `do` command line tool using the following command:

```bash
npm install -g @digitalocean/doctl
```

To login to digital ocean use the following command:

```bash
doctl auth init
```

To run a cli command on a droplet use the following command:

```bash
doctl compute ssh --ssh-command "ls -al"
```
To set an environment variable using `doctl` use the following command:

```bash
doctl compute ssh --ssh-command "export FOO=bar"
```

To list environment variables use the following command:

```bash
doctl compute ssh --ssh-command "env"
```

## Copy Existing Site

To download all the files from http://www.millbrookcampground.com/ I will do the following:

```bash
wget --recursive --no-clobber --page-requisites --html-extension --convert-links --restrict-file-names=windows --domains millbrookcampground.com --no-parent http://www.millbrookcampground.com/
```

The `--convert-links` option will convert the links to point to the local files.  
The `--domains` option will restrict the download to the specified domain.  
The `--no-parent` option will prevent the download of the parent directory.  
The `--restrict-file-names=windows` option will restrict the file names to windows.  
The `--recursive` option will download all the files.  
The `--no-clobber` option will prevent the download of files that already exist.  
The `--page-requisites` option will download all the files needed to display the page.  
The `--html-extension` option will add the html extension to the files.

So a more complete download using `wget` would be:

```bash
wget --recursive --no-clobber --page-requisites --html-extension --convert-links --restrict-file-names=windows http://www.millbrookcampground.com/
```


## Mock Server

For the time being I will use a file-based service for the backend.  The server will be a simple express server that serves json files.  To deploy the server to Digital Ocean, I will use the Digital Ocean Console to pull changes using git.  The server will run as a daemon.  To ensure the server is always running, I will use the following:

```bash
nohup node api.mjs 3001 &
```

The `nohup` stops the server from being killed when the terminal is closed.  The `&` runs the server in the background.  To stop the server, I will use the following:

```bash
killall node
```

To install nginx from the digital ocean console:

```
sudo apt update
sudo apt install nginx
```

To start nginx:

```
sudo systemctl start nginx
```

### Nginx

The current approach is to use NGINX as a reverse proxy.  This will allow me to run multiple servers on the same machine.  I will use the following configuration so users trying to visit https://ca0v.us/gl will be redirected to http://localhost:3001/app/gl/index.html:

```nginx
server {
        listen 443 ssl;
        server_name ca0v.us;

        ssl_certificate /etc/letsencrypt/live/ca0v.us/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/ca0v.us/privkey.pem; # managed by Certbot

        location /mbcvt {
                proxy_pass http://localhost:3001/app;
        }

        location /api {
                proxy_pass http://localhost:3001/api;
        }
}
```


The `listen` parameter means that the server will listen on port 443.  The `server_name` parameter means that the server will respond to requests for `ca0v.us` and `www.ca0v.us`.  The `location` parameter means that requests for `/gl` will be proxied to `http://localhost:3001/app/gl/index.html`.

To get the full path to the current directory (~) use the following command:

```bash
pwd
```


I applied that configuration by editing the file `/etc/nginx/sites-available/default` using `vi`.  Remember, so save from `vi` use `:wq`.  To exit without saving use `:q!`.  To save without exiting use `:w`.

To delete from the cursor to the end of the line use `d$`.  To delete from the cursor to the beginning of the line use `d0`.  To delete the current line use `dd`.  To delete the next 5 lines use `5dd`.  To delete the next 5 characters use `5x`.

I then restarted nginx using the following command:

```bash
systemctl restart nginx
```

To generate a TSL certificate for digital ocean:

```
certbot --nginx --agree-tos -m coreyalix@gmail.com  -d ca0v.us
```

To install certbot:

```
sudo apt install certbot python3-certbot-nginx
```

Before you can use certbot to generate a letsencrypt certificate, you must have a domain name that points to your server.  You must also have an A record that points to your server.  You must also have a CNAME record that points to your server.  My domain is "ca0v.us".  

To register a domain with digital ocean you must do the following:

1. Go to the networking tab
2. Click on domains
3. Click on add domain
4. Enter the domain name
5. Click on create domain
6. Click on the domain name
7. Click on add record
8. Click on A
9. Enter the IP address of the server
10. Click on create record
11. Click on add record
12. Click on CNAME
13. Enter the domain name

It takes some time for the "A" changes to take effect.  You may need to wait 24 hours for the changes to take effect.  You can check the status of the changes by using the following command:

```
dig ca0v.us
```

Until that time, use `161.35.110.253` as the IP address.


## Mock UX

- Show number of nights under price using "sub" tag

# See Also

Deployed to <https://dynamic-unicorn-70879a.netlify.app/site/reservation/index.html>

# Notes

- Incorporate other campgrounds -- Basecamp, Barrewood, others?
- What is Vermont Campground Association?