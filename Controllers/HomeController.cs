﻿using Newtonsoft.Json;
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
using System.Runtime.InteropServices.ComTypes;
using System.Web.UI.WebControls;
using Tiktoken;


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
        public class ChatMessage
        {
            public string role { get; set; }
            public string content { get; set; }
        }
        [HttpPost] // Change to POST
        public async Task<ActionResult> GetTokenCount(string systemPrompt, int pastMessages = 30, string chatData = null)
        {

            var encoder = ModelToEncoder.For("gpt-4o"); // or explicitly using new Encoder(new O200KBase())
            var systemTokens = encoder.CountTokens(systemPrompt); // 2
            var completiontokens = encoder.Explore(chatData);
            string totalTokens = string.Empty;
            //var TotalTokens = systemTokens + completiontokens;
            var result = new
            {
                PrompTokens = systemTokens,
                Completiontokens = completiontokens,
                TotalTokens= totalTokens
            };
            return new  JsonResult();
        }

            [HttpPost] // Change to POST
        public async Task<ActionResult> GetAIResponse(string userMessage, string systemPrompt, int pastMessages = 30, string chatData = null)
        {
            using (var httpClient = new HttpClient())
            {
                httpClient.DefaultRequestHeaders.Add("api-key", apiKey);
                // In your GetAIResponse action:
                HttpContext.Response.Headers.Remove("Content-Encoding");
                // Parse the chatData JSON string
                var pastMessagesData = JsonConvert.DeserializeObject<List<ChatMessage>>(chatData) ?? new List<ChatMessage>();
                // Take only the last 'pastMessages' number of messages
                var recentMessages = pastMessagesData.Skip(Math.Max(0, pastMessagesData.Count - pastMessages)).ToList();
                // Always add the system message at the beginning
                recentMessages.Insert(0, new ChatMessage { role = "system", content = systemPrompt });
                var payload = new
                {
                    messages = recentMessages, // Use recentMessages in the payload
                    temperature = 0.7,
                    top_p = 0.95,
                    max_tokens = 4000,
                    stream = true
                };

                var response = await httpClient.PostAsync($"{endpoint}/openai/deployments/{deploymentId}/chat/completions?api-version=2024-02-15-preview",
                                                         new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"));

                response.EnsureSuccessStatusCode();
                Response.ContentType = "text/event-stream";
                Response.CacheControl = "no-cache";
                Response.BufferOutput = false;
                string previousContent = "";

                using (var stream = await response.Content.ReadAsStreamAsync())
                using (var reader = new StreamReader(stream))
                {
                    string line;
                    while ((line = await reader.ReadLineAsync()) != null)
                    {
                        if (line.StartsWith("data: ") && line.Contains("\"delta\":"))
                        {
                            var data = line.Substring("data: ".Length);
                            dynamic jsonData = JsonConvert.DeserializeObject(data);
                            string content = jsonData.choices[0].delta.content;
                            Response.Write($"data: {content}");
                            Response.Flush();
                            Thread.Sleep(10);
                            previousContent = content;
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
