"use client";

import React, { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download, Copy } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { SessionManager } from '@/lib/session';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

interface ErrorData {
  error: string;
}

interface InspireMeResponse {
  prompt: string;
}

interface Model {
  id: string;
  name: string;
}

// Define available models
const models: Model[] = [
  { id: '@cf/black-forest-labs/flux-1-schnell', name: 'Flux 1 Schnell' },
  { id: '@cf/black-forest-labs/flux-1-beta', name: 'Flux 1 Beta' }
];

type AutotuneMode = 'manual' | 'fast' | 'v2';

const TEST_PROMPT = "a cute cat sitting on a rainbow";

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState(models[0].id)
  const [autotuneMode, setAutotuneMode] = useState<AutotuneMode>('manual')
  const [sessionId, setSessionId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Initialize session when component mounts
  useEffect(() => {
    let currentSessionId = SessionManager.getSessionFromBrowser();
    if (!currentSessionId) {
      currentSessionId = SessionManager.createNewSession();
    }
    setSessionId(currentSessionId);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setImage(null)
    setOptimizedPrompt(null)

    try {
      const response = await fetch('/api/generate_image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId, // Add session ID to request
        },
        body: JSON.stringify({ prompt, autotuneMode }),
      })

      if (!response.ok) {
        const errorData = await response.json() as ErrorData;
        throw new Error(errorData.error || 'Failed to generate image');
      }

      // Get the optimization metadata from headers
      const optimizedPrompt = response.headers.get('X-Optimized-Prompt');
      if (optimizedPrompt) {
        // Clean up the prompt
        const cleanedPrompt = decodeURIComponent(optimizedPrompt)
          // Remove {"prompt": and closing }
          .replace(/^{"prompt":\s*"|"}$/g, '')
          // Remove any escaped quotes
          .replace(/\\"/g, '"')
          // Clean up any double spaces
          .trim();
          
        setOptimizedPrompt(cleanedPrompt);
      }
      const optimizationStatus = response.headers.get('X-Optimization-Status')
      const errorMessage = response.headers.get('X-Error-Message')

      // Get the image data
      const imageData = await response.text()
      
      // Validate and clean the image data
      if (!imageData.startsWith('data:image/png;base64,')) {
        // If it's just base64, add the prefix
        if (/^[A-Za-z0-9+/=]+$/.test(imageData)) {
          setImage(`data:image/png;base64,${imageData}`);
        } else {
          throw new Error('Invalid image data received');
        }
      } else {
        setImage(imageData);
      }

      if (errorMessage) {
        console.warn('Optimization warning:', errorMessage)
      }
    } catch (err) {
      setError('Error generating image. Please try again.')
      console.error('Error generating image:', err)
    } finally {
      setLoading(false)
    }
  }, [prompt, autotuneMode, sessionId]) // Add sessionId to dependencies

  const isFormValid = useCallback(() => {
    return model && prompt.trim() !== ''
  }, [model, prompt])

  const handleDownload = useCallback(() => {
    if (image) {
      const link = document.createElement('a')
      link.href = image
      link.download = 'generated-image.png'
      link.click()
    }
  }, [image])

  const handleInspireMe = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/inspire_me")
      if (response.ok) {
        const data = await response.json() as InspireMeResponse
        console.log("Received inspiration:", data.prompt)
        setPrompt(data.prompt)
      } else {
        console.error("Failed to get inspiration:", response.status)
      }
    } catch (error) {
      console.error("Error getting inspiration:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Prompt copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy text: ', err)
    })
  }, [])

  const handleRefreshSession = async () => {
    setRefreshing(true);
    try {
      const newSessionId = await SessionManager.refreshSession();
      setSessionId(newSessionId);
      setImage(null);
      setOptimizedPrompt(null);
      setPrompt('');
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Add test function
  const testImageGeneration = useCallback(async () => {
    console.log("Running test image generation...");
    try {
      const response = await fetch('/api/test_generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: TEST_PROMPT,
          model: '@cf/black-forest-labs/flux-1-schnell'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const imageData = await response.text();
      console.log("Test image generated successfully");
      console.log("Image data starts with:", imageData.substring(0, 100));
      
      // Display the test image
      setImage(imageData);
    } catch (error) {
      console.error("Test image generation failed:", error);
    }
  }, []);

  // Run test on mount
  useEffect(() => {
    testImageGeneration();
  }, [testImageGeneration]);

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      <ResizablePanel defaultSize={50}>
        <div className="block flex-col h-full">
          <div className="p-4 bg-transparent space-y-2">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Workers AI Image Generator</h1>
              <Button 
                onClick={handleRefreshSession} 
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  'New Session'
                )}
              </Button>
            </div>
            <h2 className="text-lg mb-8">
              Powered by <a href="https://developers.cloudflare.com/workers-ai" className="text-primary hover:text-primary-hover hover:underline">Cloudflare Workers AI</a>. 
            </h2>
          </div>
          <div className="flex-grow overflow-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700">AI Model</label>
                <Select onValueChange={setModel} value={model}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select an AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(({ id, name }) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">Prompt *</label>
                  <Button 
                    type="button" 
                    onClick={handleInspireMe} 
                    variant="outline" 
                    size="sm"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Inspire Me'
                    )}
                  </Button>
                </div>
                <Textarea
                  id="prompt"
                  placeholder="Enter your image prompt here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[40px] resize-y"
                  required
                />
              </div>
              
              {model === "@cf/black-forest-labs/flux-1-schnell" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Optimization Mode</label>
                  <div className="flex items-baseline gap-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="manual"
                        value="manual"
                        checked={autotuneMode === 'manual'}
                        onChange={(e) => setAutotuneMode('manual')}
                        className="form-radio h-4 w-4 text-primary"
                      />
                      <label htmlFor="manual">Manual</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="fast"
                        value="fast"
                        checked={autotuneMode === 'fast'}
                        onChange={(e) => setAutotuneMode('fast')}
                        className="form-radio h-4 w-4 text-primary"
                      />
                      <label htmlFor="fast">Autotune Fast</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="v2"
                        value="v2"
                        checked={autotuneMode === 'v2'}
                        onChange={(e) => setAutotuneMode('v2')}
                        className="form-radio h-4 w-4 text-primary"
                      />
                      <label htmlFor="v2">Autotune V2</label>
                    </div>
                  </div>
                  
                  {optimizedPrompt && (
                    <div className="mt-4 bg-white p-4 rounded-lg shadow">
                      <h3 className="font-bold mb-2">Optimized Prompt:</h3>
                      <p className="mb-2">{optimizedPrompt}</p>
                      <Button onClick={() => copyToClipboard(optimizedPrompt)} size="sm">
                        <Copy className="mr-2 h-4 w-4" /> Copy
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
          <div className="p-4 bg-transparent">
            <Button onClick={handleSubmit} disabled={loading || !isFormValid()} className="w-full">
              Generate Image
            </Button>
          </div>
        </div>
      </ResizablePanel>
      
      <ResizableHandle />
      
      <ResizablePanel defaultSize={50}>
        <div className="h-full flex items-center justify-center p-4 bg-gray-50">
          {loading ? (
            <Loader2 className="h-16 w-16 animate-spin" />
          ) : image ? (
            <div className="w-full">
              <img src={image} alt="Generated" className="w-full h-auto rounded-lg shadow-lg mb-4" />
              <Button onClick={handleDownload} className="mt-4">
                <Download className="mr-2 h-4 w-4" /> Download Image
              </Button>
            </div>
          ) : (
            <div className="text-center text-gray-500">Your generated image will appear here</div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default ImageGenerator
