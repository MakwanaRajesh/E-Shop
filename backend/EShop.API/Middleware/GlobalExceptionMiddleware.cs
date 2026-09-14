using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Serilog;

namespace EShop.API.Middleware;

/// <summary>
/// Catches all unhandled exceptions in the pipeline and returns a structured
/// ProblemDetails JSON response instead of leaking stack traces.
/// </summary>
public class GlobalExceptionMiddleware(RequestDelegate next)
{
    private readonly RequestDelegate _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title) = exception switch
        {
            FluentValidation.ValidationException => (HttpStatusCode.BadRequest,       "Validation failed"),
            UnauthorizedAccessException          => (HttpStatusCode.Unauthorized,     "Unauthorised"),
            KeyNotFoundException                 => (HttpStatusCode.NotFound,         "Resource not found"),
            InvalidOperationException            => (HttpStatusCode.BadRequest,       "Invalid operation"),
            ArgumentException                    => (HttpStatusCode.BadRequest,       "Invalid argument"),
            _                                    => (HttpStatusCode.InternalServerError, "An unexpected error occurred")
        };

        // Log appropriately — 500s as errors, client errors as warnings
        if (statusCode == HttpStatusCode.InternalServerError)
            Log.Error(exception, "Unhandled exception: {Message}", exception.Message);
        else
            Log.Warning(exception, "Handled exception ({Status}): {Message}", (int)statusCode, exception.Message);

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode  = (int)statusCode;

        // Build errors list for validation exceptions
        List<string> errors = [];
        if (exception is FluentValidation.ValidationException validationEx)
            errors = validationEx.Errors.Select(e => e.ErrorMessage).ToList();

        var problem = new ProblemDetails
        {
            Status   = (int)statusCode,
            Title    = title,
            Detail   = exception.Message,
            Instance = context.Request.Path
        };

        if (errors.Count > 0)
            problem.Extensions["errors"] = errors;

        var json = JsonSerializer.Serialize(problem, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
