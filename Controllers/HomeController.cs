using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http.Headers;
using System.Net.Http;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Configuration;
using System.Threading;


namespace WebApplication4.Controllers
{
    public class HomeController : Controller
    {
        private readonly string endpoint = ConfigurationManager.AppSettings["Endpoint"];
        private readonly string apiKey = ConfigurationManager.AppSettings["ApiKey"];
        private readonly string deploymentId = ConfigurationManager.AppSettings["DeploymentId"];

        public ActionResult Index()
        {
            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";
            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";
            return View();
        }


        [HttpGet] // Change to GET request for SSE
        public async Task<ActionResult> GetAIResponse(string userMessage, string systemPrompt)
        {
            using (var httpClient = new HttpClient())
            {
                httpClient.DefaultRequestHeaders.Add("api-key", apiKey);
                // In your GetAIResponse action:
                HttpContext.Response.Headers.Remove("Content-Encoding");

                var payload = new
                {
                    messages = new object[]
                    {
                        new {
                            role = "system",
                            content = new object[] {
                                new {
                                    type = "text",
                                    text = systemPrompt // Use systemPrompt here
                                }
                            }
                        },
                        new {
                            role = "user",
                            content = new object[] {
                                new {
                                    type = "text",
                                    text = userMessage // Use userMessage here
                                }
                            }
                        }
                    },
                    temperature = 0.7,
                    top_p = 0.95,
                    max_tokens = 800,
                    stream = true // Enable streaming
                };

                var response = await httpClient.PostAsync($"{endpoint}/openai/deployments/{deploymentId}/chat/completions?api-version=2024-02-15-preview",
                                                         new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"));

                response.EnsureSuccessStatusCode();
                Response.ContentType = "text/event-stream";
                Response.CacheControl = "no-cache";
                Response.BufferOutput = false;

                using (var stream = await response.Content.ReadAsStreamAsync())
                using (var reader = new StreamReader(stream))
                {
                    string line;
                    while ((line = await reader.ReadLineAsync()) != null)
                    {
                        if (line.StartsWith("data: ") && line.Contains("\"delta\":"))
                        {
                            var data = line.Substring("data: ".Length);
                            if (!string.IsNullOrWhiteSpace(data) && data != "[DONE]")
                            {
                                Response.Write($"data: {data}\n\n"); // SSE format

                                Response.Flush();
                                Console.WriteLine($"Data sent: {data}"); // Add this line
                                Thread.Sleep(10);
                            }
                        }
                    }
                }
               

                Response.Write("data: [DONE]\n\n"); // Signal completion
                Response.Flush();

                return new EmptyResult();
            }
        }
    }
}
