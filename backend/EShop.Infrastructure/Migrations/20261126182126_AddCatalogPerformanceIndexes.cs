using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EShop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProductImages_ProductId",
                table: "ProductImages");

            migrationBuilder.CreateIndex(
                name: "IX_Products_IsActive_CategoryId_Price",
                table: "Products",
                columns: new[] { "IsActive", "CategoryId", "Price" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_IsActive_CreatedAt",
                table: "Products",
                columns: new[] { "IsActive", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_IsActive_IsFeatured_CreatedAt",
                table: "Products",
                columns: new[] { "IsActive", "IsFeatured", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_ProductId_IsPrimary_SortOrder",
                table: "ProductImages",
                columns: new[] { "ProductId", "IsPrimary", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_IsActive_ParentId_SortOrder",
                table: "Categories",
                columns: new[] { "IsActive", "ParentId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_IsActive_CategoryId_Price",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_IsActive_CreatedAt",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_IsActive_IsFeatured_CreatedAt",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_ProductImages_ProductId_IsPrimary_SortOrder",
                table: "ProductImages");

            migrationBuilder.DropIndex(
                name: "IX_Categories_IsActive_ParentId_SortOrder",
                table: "Categories");

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_ProductId",
                table: "ProductImages",
                column: "ProductId");
        }
    }
}
