# PHP + Apache parecido com a hospedagem (cPanel): mod_rewrite, .htaccess valendo, PDO MySQL e cURL
FROM php:8.1-apache
RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers \
 && sed -ri 's#AllowOverride None#AllowOverride All#g' /etc/apache2/apache2.conf
