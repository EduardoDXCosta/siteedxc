FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/
COPY politica-de-privacidade.html /usr/share/nginx/html/
COPY politica-de-cookies.html /usr/share/nginx/html/
COPY termos-de-servico.html /usr/share/nginx/html/
COPY direitos-do-titular.html /usr/share/nginx/html/
COPY site-consolidado.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY cookie-consent.js /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 80
