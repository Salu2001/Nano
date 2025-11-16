// worker.js - Fixed version for Cloudflare Workers
const IMAGE_UPLOAD_URL = "https://wallpaperaccess.com/full/1556608.jpg";

// CORS headers helper
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Handle OPTIONS requests for CORS
        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Route requests
            if (path === '/' && method === 'GET') {
                return await handleRoot(request);
            } else if (path === '/health' && method === 'GET') {
                return await handleHealth(request);
            } else if (path === '/v1/image/generations' && method === 'POST') {
                return await handleImageGeneration(request);
            } else {
                return await handleNotFound(request);
            }
        } catch (error) {
            console.error('Unhandled error:', error);
            return new Response(
                JSON.stringify({ error: 'Internal server error' }),
                { 
                    status: 500, 
                    headers: { 
                        'Content-Type': 'application/json',
                        ...corsHeaders 
                    } 
                }
            );
        }
    },
};

// Request handlers
async function handleRoot(request) {
    const responseData = {
        message: "🍌 Nano Banana Image Generation API",
        version: "1.0.0",
        description: "Generate images from text prompts and upload to uguu.se",
        endpoints: {
            "POST /v1/image/generations": "Generate image from prompt",
            "GET /health": "Health check"
        }
    };

    return new Response(
        JSON.stringify(responseData),
        { 
            headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
            } 
        }
    );
}

async function handleHealth(request) {
    const responseData = {
        status: "healthy",
        service: "Nano Banana Image Generation API",
        timestamp: new Date().toISOString()
    };

    return new Response(
        JSON.stringify(responseData),
        { 
            headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
            } 
        }
    );
}

async function handleImageGeneration(request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return new Response(
                JSON.stringify({ error: 'Content-Type must be application/json' }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
        }

        const requestBody = await request.json();
        
        // Validate request
        if (!requestBody.prompt || !requestBody.prompt.trim()) {
            return new Response(
                JSON.stringify({ error: 'Prompt cannot be empty' }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
        }

        const prompt = requestBody.prompt;
        const imageUrl = requestBody.image_url || null;

        console.log(`Received image generation request: prompt='${prompt.substring(0, 50)}...', image_url='${imageUrl}'`);

        // Generate image
        const provider = new VisualGPTProvider();
        const uploadedUrl = await provider.generateImage(prompt, imageUrl);

        const responsePayload = {
            created: Math.floor(Date.now() / 1000),
            data: [
                {
                    url: uploadedUrl,
                    revised_prompt: prompt
                }
            ]
        };

        console.log('Successfully generated and uploaded image, returning uguu.se URL');

        return new Response(
            JSON.stringify(responsePayload),
            { 
                headers: { 
                    'Content-Type': 'application/json',
                    ...corsHeaders
                } 
            }
        );

    } catch (error) {
        console.error('Error in image generation:', error);
        
        const status = error.status || 500;
        const message = error.message || 'Internal server error';

        return new Response(
            JSON.stringify({ error: message }),
            { 
                status, 
                headers: { 
                    'Content-Type': 'application/json',
                    ...corsHeaders
                } 
            }
        );
    }
}

async function handleNotFound(request) {
    return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        { 
            status: 404, 
            headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
            } 
        }
    );
}

// VisualGPT Provider Class
class VisualGPTProvider {
    constructor() {
        this.cookieString = this.generateCookie();
        
        this.headersStep1 = {
            "accept": "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
            "content-type": "application/json; charset=UTF-8",
            "cookie": this.cookieString,
            "origin": "https://visualgpt.io",
            "referer": "https://visualgpt.io/ai-models/nano-banana",
            "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Microsoft Edge";v="140"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0"
        };

        this.headersStep2 = {
            "accept": "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
            "cookie": this.cookieString,
            "referer": "https://visualgpt.io/ai-models/nano-banana",
            "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Microsoft Edge";v="140"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0"
        };
    }

    generateCookie() {
        const anonUserId = crypto.randomUUID();
        return (
            "_ga=GA1.1.1802416543.1757653998; " +
            "_ga_PZ8PZQP57J=GS2.1.s1757653997$o1$g0$t1757653997$j60$l0$h0; " +
            `anonymous_user_id=${anonUserId}; ` +
            "sbox-guid=MTc1NzY1Mzk5OXw0OTJ8OTMxOTE4NDg0; " +
            "crisp-client%2Fsession%2Fe48f416d-75e9-492f-9624-e9a4772aef40=session_8314853f-cfcb-4730-a7cb-9accce3fcce4"
        );
    }

    async submitPrediction(prompt, imageUrl = null) {
        const url = "https://visualgpt.io/api/v1/prediction/handle";
        const startingImage = imageUrl && imageUrl.trim() ? imageUrl : IMAGE_UPLOAD_URL;

        const payload = {
            "image_urls": [startingImage],
            "type": 61,
            "user_prompt": prompt,
            "sub_type": 2,
            "aspect_ratio": "",
            "num": ""
        };

        console.log(`Submitting prediction request for prompt: ${prompt.substring(0, 50)}... with image: ${startingImage}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: this.headersStep1,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.code === 100000 && data.data && data.data.session_id) {
            const sessionId = data.data.session_id;
            console.log(`Prediction submitted successfully, session_id: ${sessionId}`);
            return sessionId;
        } else {
            console.error(`Submission failed: ${data.message || 'unknown error'}`);
            throw new Error(`Submission failed: ${data.message || 'unknown error'}`);
        }
    }

    async pollStatus(sessionId, timeout = 120000, interval = 5000) {
        const url = `https://visualgpt.io/api/v1/prediction/get-status?session_id=${sessionId}`;
        const start = Date.now();
        console.log(`Starting to poll status for session_id: ${sessionId}`);

        while (true) {
            const headers = { ...this.headersStep2 };

            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Check for server-side timeout
            const msg = data.message || "";
            if (msg.toLowerCase().includes("time") && msg.toLowerCase().includes("out")) {
                console.error("Session timed out on server side");
                throw new Error("Session timed out on server side.");
            }

            const results = data.data?.results || [];
            if (results.length > 0) {
                const result = results[0];
                const status = result.status || "";
                console.log(`Current status: ${status}`);
                
                if (status === "succeeded") {
                    const imgUrl = result.url || "";
                    if (imgUrl) {
                        console.log(`Image generation succeeded: ${imgUrl}`);
                        return imgUrl;
                    } else {
                        console.error("Succeeded status but URL is empty");
                        throw new Error("Succeeded status but URL is empty.");
                    }
                } else if (status === "failed") {
                    console.error("Image generation failed");
                    throw new Error("Generation failed.");
                }
            }

            // Timeout check
            if (Date.now() - start > timeout) {
                console.error(`Timeout waiting for image generation after ${timeout}ms`);
                throw new Error("Timeout waiting for image generation.");
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    async generateImage(prompt, imageUrl = null) {
        try {
            const startingImage = imageUrl && imageUrl.trim() ? imageUrl : IMAGE_UPLOAD_URL;
            console.log(`Starting image generation for prompt: ${prompt.substring(0, 50)}... with starting_image: ${startingImage}`);
            
            const sessionId = await this.submitPrediction(prompt, startingImage);
            const originalImageUrl = await this.pollStatus(sessionId);

            // Upload to uguu.se and return the new URL
            const uploadedUrl = await this.uploadImageToUguu(originalImageUrl);
            console.log("Image generation and upload completed successfully");
            return uploadedUrl;
        } catch (error) {
            console.error(`Image generation failed: ${error.message}`);
            throw error;
        }
    }

    async uploadImageToUguu(imageUrl) {
        console.log(`Downloading image from: ${imageUrl}`);

        // Download the image
        const response = await fetch(imageUrl, {
            headers: { "Referer": "https://visualgpt.io" }
        });

        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
        }

        const imageBuffer = await response.arrayBuffer();
        
        // Extract filename from URL or use default
        let filename = imageUrl.split("/").pop();
        if (!filename || !filename.includes(".")) {
            filename = `generated_image_${Date.now()}.jpg`;
        }

        console.log(`⏳ Uploading image to uguu.se as ${filename}...`);

        // Create form data for upload
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append("files[]", blob, filename);

        const uploadResponse = await fetch("https://uguu.se/upload", {
            method: "POST",
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }

        const data = await uploadResponse.json();

        if (!data.success || !data.files) {
            throw new Error(`Unexpected upload response: ${JSON.stringify(data)}`);
        }

        const url = data.files[0]?.url;

        if (!url) {
            throw new Error("No URL returned from upload");
        }

        console.log(`✅ Upload successful: ${url}`);
        return url;
    }
}