FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Cache dependency resolution in its own layer, separate from source changes.
COPY services/export-worker/pom.xml .
RUN mvn -q -B dependency:go-offline

COPY services/export-worker/src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/target/export-worker-*.jar app.jar

EXPOSE 8080

# Tuned for a small, low-traffic internal service, not throughput: a modest
# fixed heap, the serial collector (lower memory overhead than the default
# G1 at this heap size), and tiered compilation capped at C1 (faster startup,
# skips the JIT's more memory-hungry C2 tier — a reasonable trade for a
# service that isn't doing sustained hot-loop work).
ENTRYPOINT ["java", \
  "-Xmx256m", "-Xss512k", "-XX:MaxMetaspaceSize=128m", \
  "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", \
  "-jar", "app.jar"]

HEALTHCHECK --interval=10s --timeout=5s --retries=15 --start-period=30s \
    CMD wget -q -O- http://localhost:8080/health || exit 1
