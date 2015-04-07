#
# Dockerfile for nginx
#

FROM    dockerfile/nginx

RUN     mkdir /bundle; chmod 755 /bundle;

RUN     nginx -t

RUN     ls -la /bundle

EXPOSE  80

# Because this container is linked to the node one,
# it will not start the NGINX with this command:
#
# CMD     ["nginx", "-g", "daemon off;"]
#
# We have to use a startup script that configures NGINX 
# with the node IP / port and then starts it.
# (Only because NGINX does not support system ENV variable in its config)

CMD     ["/bin/bash", "/data/start.sh"]
