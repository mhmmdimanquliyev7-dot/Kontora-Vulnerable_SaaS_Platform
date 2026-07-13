FROM php:8.3-apache

# libpq-dev provides libpq-fe.h, needed to compile the pdo_pgsql extension —
# must be installed before docker-php-ext-install runs, not after.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev curl \
    && docker-php-ext-install pdo pdo_pgsql \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite

COPY services/report-service/docker/php.ini /usr/local/etc/php/conf.d/report-service.ini
COPY services/report-service/docker/000-default.conf /etc/apache2/sites-available/000-default.conf

COPY services/report-service/src/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=10 \
    CMD curl -f http://localhost/health || exit 1
