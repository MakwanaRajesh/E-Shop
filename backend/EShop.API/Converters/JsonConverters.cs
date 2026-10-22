using System.Text.Json;
using System.Text.Json.Serialization;
using EShop.Core.Enums;

namespace EShop.API.Converters;

public class NullableGuidConverter : JsonConverter<Guid?>
{
    public override Guid? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;

        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString();
            if (string.IsNullOrWhiteSpace(str) || str == "new" || str == "null" || str == "undefined")
                return null;

            if (Guid.TryParse(str, out var guid))
                return guid;

            return null;
        }

        return null;
    }

    public override void Write(Utf8JsonWriter writer, Guid? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
            writer.WriteStringValue(value.Value);
        else
            writer.WriteNullValue();
    }
}

public class PaymentMethodConverter : JsonConverter<PaymentMethod>
{
    public override PaymentMethod Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number)
        {
            var intVal = reader.GetInt32();
            if (Enum.IsDefined(typeof(PaymentMethod), intVal))
                return (PaymentMethod)intVal;
            return PaymentMethod.CashOnDelivery;
        }

        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString()?.Trim().ToLowerInvariant() ?? "";
            if (str == "cod" || str.Contains("cash") || str == "cashondelivery" || str == "cash_on_delivery" || str == "1")
                return PaymentMethod.CashOnDelivery;
            if (str == "razorpay" || str.Contains("card") || str.Contains("online") || str == "upi" || str == "0")
                return PaymentMethod.Razorpay;
            if (str.Contains("bank") || str == "2")
                return PaymentMethod.BankTransfer;
        }

        return PaymentMethod.CashOnDelivery;
    }

    public override void Write(Utf8JsonWriter writer, PaymentMethod value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString());
    }
}
