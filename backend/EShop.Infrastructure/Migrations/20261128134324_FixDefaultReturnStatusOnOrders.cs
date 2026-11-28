using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EShop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixDefaultReturnStatusOnOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"UPDATE ""Orders"" SET ""ReturnStatus"" = 'None' WHERE ""ReturnStatus"" = '' OR ""ReturnStatus"" IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "ReturnStatus",
                table: "Orders",
                type: "text",
                nullable: false,
                defaultValue: "None",
                oldClrType: typeof(string),
                oldType: "text");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ReturnStatus",
                table: "Orders",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "None");
        }
    }
}
