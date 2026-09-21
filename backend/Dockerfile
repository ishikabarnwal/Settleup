# Production image for the API. Render builds it from render.yaml; locally:
#   docker build -t settleup-api backend

# Build the jar. Tests are skipped here because they start their own Postgres
# with Testcontainers, which needs Docker; run them with ./mvnw verify instead.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Dependencies get their own layer, so a code-only change doesn't download them again.
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 settleup
COPY --from=build /app/target/settleup-backend-*.jar app.jar
USER settleup

ENV SPRING_PROFILES_ACTIVE=prod
# Small instances (Render's free plan has 512 MB) leave the JVM a tiny heap by
# default; let it use most of the container's memory instead.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

# Render sets PORT; 8080 is the fallback in application.properties.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
