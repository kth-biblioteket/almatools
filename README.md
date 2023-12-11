# KTH Bibliotekets Alma Verktyg

##

###


#### Dependencies

Node 16.13.2

##### Installation

1.  Skapa folder på server med namnet på repot: "/local/docker/almatools"
2.  Skapa och anpassa docker-compose.yml i foldern

´´´ yml
version: '3.6'

services:
  almatools:
    container_name: almatools
    image: ghcr.io/kth-biblioteket/almatools:${REPO_TYPE}
    restart: always
    env_file:
      - almatools.env
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.almatools.rule=Host(`${DOMAIN_NAME}`) && PathPrefix(`${PATHPREFIX}`)"
      - "traefik.http.routers.almatools.entrypoints=websecure"
      - "traefik.http.routers.almatools.tls=true"
      - "traefik.http.routers.almatools.tls.certresolver=myresolver"
    networks:
      - "apps-net"

    almatools-db:
      container_name: almatools-db
      image: mysql:8.0
      restart: unless-stopped
      command: --default-authentication-plugin=mysql_native_password
      environment:
        TZ: ${TZ}
        MYSQL_DATABASE: ${DB_DATABASE}
        MYSQL_USER: ${DB_USER}
        MYSQL_PASSWORD: ${DB_PASSWORD}
        MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      volumes:
        - persistent-almatools-db:/var/lib/mysql
        - ./dbinit:/docker-entrypoint-initdb.d
      networks:
        - "apps-net"

volumes:
  persistent-almatools-db:
  
networks:
  apps-net:
    external: true

´´´
3.  Skapa och anpassa .env(för composefilen) i foldern
```
PATHPREFIX=/almatools
DOMAIN_NAME=apps-ref.lib.kth.se
REPO_TYPE=ref
```
4.  Skapa och anpassa almatools.env (för applikationen) i foldern
```
WEBHOOK_SECRET=xxxxxx
PORT=80
SECRET=xxxxxx
AUTHORIZEDGROUPS=pa.anstallda.T.TR;pa.anstallda.M.MOE
LDAP_API_URL=api-ref.lib.kth.se/ldap/api/v1/
LDAPAPIKEYREAD=xxxxxx
SOCKETIOPATH=/almatools/socket.io
DATABASEHOST=almatools-db
DB_DATABASE=almatools
DB_USER=almatools
DB_PASSWORD=xxxxxx
DB_ROOT_PASSWORD=xxxxxx
DB_UPDATE_PATH=/dbupdate/update.sql

ALMAPIENDPOINT=https://api-eu.hosted.exlibrisgroup.com/almaws/v1/
ALMAAPIKEY=xxxxxx

NETSCHECKOUTKEY=test-checkout-key-xxxxxxxxxx
NETSAPIURL=https://api.dibspayment.eu/v1/payments/
NETSCHECKOUTURL=https://checkout.dibspayment.eu/v1/checkout.js?v=1
TOCURL=https://apps.lib.kth.se/almatools/toc.html
GDPRURL=https://apps.lib.kth.se/almatools/gdpr.html
CHECKOUTURL=https://apps.lib.kth.se/almatools/payment/checkout
EXLIBRISPUBLICKEY_URL=https://api-eu.hosted.exlibrisgroup.com/auth/46KTH_INST/jwks.json?env=sandbox

ALMATOOLSAPI_INTERNAL_ENDPOINT=http://almatools-api/

CREATEPAYMENTURL=https://api.lib.kth.se/almatolls/v1/createpayment/

CORS_WHITELIST="https://apps.lib.kth.se, https://apps-ref.lib.kth.se, https://www.kth.se"
ENVIRONMENT=development
NODE_ENV=development
```
5. Skapa folder "local/docker/almatools/dbinit"
6. Skapa init.sql från repots dbinit/init.sql
7. Skapa deploy_ref.yml i github actions
8. Skapa deploy_prod.yml i github actions
9. Github Actions bygger en dockerimage i github packages
10. Starta applikationen med docker compose up -d --build i "local/docker/almatools"