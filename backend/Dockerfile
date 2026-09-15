# Build Stage (context: backend/)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and csproj files for layer caching
COPY EShop.sln ./
COPY EShop.Core/EShop.Core.csproj EShop.Core/
COPY EShop.Infrastructure/EShop.Infrastructure.csproj EShop.Infrastructure/
COPY EShop.API/EShop.API.csproj EShop.API/

# Restore dependencies
RUN dotnet restore EShop.sln

# Copy the rest of backend source code
COPY . ./

# Build and publish release
WORKDIR /src/EShop.API
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "EShop.API.dll"]
