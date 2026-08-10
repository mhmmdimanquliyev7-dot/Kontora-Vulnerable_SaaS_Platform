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

# Chapter 16 — unrestricted file upload -> RCE lab (INTENTIONAL). NEW, isolated
# Apache fragment that serves the shared blog_media volume at /media/blog with a
# .php handler (see media-blog.conf). conf-enabled/*.conf is auto-loaded, so no
# a2enconf is needed. The mountpoint is created + owned so the volume mounts
# cleanly; the existing report app under /var/www/html is untouched.
COPY services/report-service/docker/media-blog.conf /etc/apache2/conf-enabled/media-blog.conf
RUN mkdir -p /var/www/media/blog && chown -R www-data:www-data /var/www/media

COPY services/report-service/src/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=10 \
    CMD curl -f http://localhost/health || exit 1
