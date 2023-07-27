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
APIROUTESPATH=/almatools/api/v1
LDAP_API_URL=api-ref.lib.kth.se/ldap/api/v1/
LDAPAPIKEYREAD=xxxxxx
SOCKETIOPATH=/almatools/socket.io
DATABASEHOST=almatools-db
DB_DATABASE=almatools
DB_USER=almatools
DB_PASSWORD=xxxxxx
DB_ROOT_PASSWORD=xxxxxx
ALMA_API_KEY=xxxxxx
CORS_WHITELIST="http://localhost, https://apps.lib.kth.se, https://apps-ref.lib.kth.se, https://www.kth.se"
ENVIRONMENT=development
```
5. Skapa folder "local/docker/almatools/dbinit"
6. Skapa init.sql från repots dbinit/init.sql
7. Skapa deploy_ref.yml i github actions
8. Skapa deploy_prod.yml i github actions
9. Github Actions bygger en dockerimage i github packages
10. Starta applikationen med docker compose up -d --build i "local/docker/almatools"