using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EShop.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderLifecycleAndReturnRefunds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ConfirmedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CourierName",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerRefundAccount",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OutForDeliveryAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessingAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundAmount",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundMethod",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundReference",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefundedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnAdminNotes",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnApprovedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnCustomerNotes",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ReturnInventoryRestocked",
                table: "Orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnPickedUpAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnPickupTracking",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnReason",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnReceivedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnRequestedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnStatus",
                table: "Orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ReturnStatus",
                table: "Orders",
                column: "ReturnStatus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_ReturnStatus",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CourierName",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerRefundAccount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "OutForDeliveryAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ProcessingAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundAmount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundMethod",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundReference",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnAdminNotes",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnApprovedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnCustomerNotes",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnInventoryRestocked",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnPickedUpAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnPickupTracking",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnReason",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnReceivedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnRequestedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ReturnStatus",
                table: "Orders");
        }
    }
}
