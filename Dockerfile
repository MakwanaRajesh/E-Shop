# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and csproj files for layer caching
COPY backend/EShop.sln ./
COPY backend/EShop.Core/EShop.Core.csproj backend/EShop.Core/
COPY backend/EShop.Infrastructure/EShop.Infrastructure.csproj backend/EShop.Infrastructure/
COPY backend/EShop.API/EShop.API.csproj backend/EShop.API/

# Restore dependencies
RUN dotnet restore backend/EShop.sln

# Copy the rest of backend source code
COPY backend/ ./backend/

# Build and publish release
WORKDIR /src/backend/EShop.API
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Respect Render/Railway/Cloud Run PORT environment variable (default 10000)
EXPOSE 10000

COPY --from=build /app/publish .

ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-10000} exec dotnet EShop.API.dll"]
