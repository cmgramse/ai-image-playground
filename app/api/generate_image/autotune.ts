import { elementSelectionPrompt, promptOptimizationPrompt, fastOptimizationPrompt } from './promptScripts';

interface CloudflareAI {
    run: (model: string, options: any, gatewayConfig: any) => Promise<any>;
}

// Custom error class
class AutotuneError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AutotuneError';
    }
}

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unknown error occurred';
}

// Simplified Gateway interface
export interface GatewayConfig {
  gateway: {
    id: string;
  }
}

export async function selectPromptElements(
    ai: any, 
    userPrompt: string
) {
    console.log(`Selecting elements for prompt: "${userPrompt}"`);
    
    const messages = [
        { role: "system", content: elementSelectionPrompt },
        { role: "user", content: userPrompt }
    ];

    try {
        console.log('Sending element selection request:', JSON.stringify(messages));
        const response = await ai.run('@hf/mistral/mistral-7b-instruct-v0.2', {
            messages: messages,
            max_tokens: 8000,
            temperature: 0.6,
            top_p: 1,
            top_k: 40,
            stream: false}, {
                gateway: {
                    id: "image-generator",
                    skipCache: false,
                    cacheTtl: 3360
                }
            }); 
        console.log('Raw AI response:', response);
        console.log('Full AI response:', JSON.stringify(response, null, 2));

        if (!response || !response.response) {
            throw new AutotuneError('No response received from LLM');
        }

        try {
            // Convert the response to a proper selectedElements format
            const parsedResponse = JSON.parse(response.response.trim());
            
            // Transform the response into the expected format
            const selectedElements = {
                categories: Object.entries(parsedResponse).map(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                        return {
                            name: key,
                            elements: Object.entries(value as object).map(([subKey, subValue]) => ({
                                name: subKey,
                                descriptors: Array.isArray(subValue) ? subValue : [subValue]
                            }))
                        };
                    }
                    return null;
                }).filter(Boolean)
            };

            console.log('Transformed elements:', JSON.stringify(selectedElements, null, 2));
            return selectedElements;
            
        } catch (error) {
            console.error('Error parsing JSON response:', error);
            throw new AutotuneError(`Failed to parse AI response: ${getErrorMessage(error)}`);
        }
    } catch (error) {
        console.error('Error selecting prompt elements:', error);
        throw error;
    }
}

export async function optimizeWithElements(
    ai: any, 
    userPrompt: string, 
    selectedElements: any
) {
    console.log(`Optimizing prompt with elements: "${userPrompt}"`);
    
    const formattedElements = JSON.stringify(selectedElements, null, 2);
    const systemPrompt = `${promptOptimizationPrompt}\n\ndescriptors:\n${formattedElements}`;
    
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    try {
        console.log('Sending optimization request:', JSON.stringify(messages));
        const response = await ai.run('@cf/qwen/qwen1.5-14b-chat-awq', {
            messages: messages,
            max_tokens: 8000,
            temperature: 0.3,
            top_p: 1,
            top_k: 40,
            stream: false}, 
            {
            gateway: {
            id: "image-generator",
            skipCache: false,
            cacheTtl: 3360
            }
        }); 

        console.log('Raw optimization response:', response);
        console.log('Full optimization response:', JSON.stringify(response, null, 2));

        if (!response || !response.response) {
            throw new AutotuneError('No response received from optimization LLM');
        }

        try {
            const responseText = response.response.trim();
            
            // Try parsing as JSON first
            try {
                const jsonResponse = JSON.parse(responseText);
                if (jsonResponse.prompt) {
                    return jsonResponse.prompt;
                }
            } catch (e) {
                // If JSON parsing fails, try extracting the prompt directly
                console.log('JSON parsing failed, attempting to extract prompt directly');
            }

            // Extract the prompt from the response text
            const promptMatch = responseText.match(/(?:"Optimized Prompt":|"prompt":)\s*"([^"]+)"/i);
            if (promptMatch && promptMatch[1]) {
                return promptMatch[1];
            }

            // If the response is just a quoted string, remove the quotes
            if (responseText.startsWith('"') && responseText.endsWith('"')) {
                return responseText.slice(1, -1);
            }

            // If none of the above work, return the raw response
            if (responseText.length > 0) {
                return responseText;
            }

            throw new AutotuneError('Could not extract valid prompt from response');
        } catch (error) {
            console.error('Error parsing optimization response:', error);
            throw new AutotuneError(`Failed to parse optimization response: ${getErrorMessage(error)}`);
        }
    } catch (error) {
        console.error('Error optimizing prompt with elements:', error);
        throw error;
    }
}

export async function fastAutotune(
    ai: any,
    userPrompt: string
) {
    console.log('Starting fast autotune optimization...');
    console.log(`Input prompt: "${userPrompt}"`);
    
    const messages = [
        { role: "system", content: fastOptimizationPrompt },
        { role: "user", content: userPrompt }
    ];

    try {
        console.log('Calling Mistral model for fast optimization...');
        const response = await ai.run('@hf/mistral/mistral-7b-instruct-v0.2', {
            messages: messages,
            max_tokens: 8000,
            temperature: 0.7,
            top_p: 1,
            top_k: 40,
            stream: false
        }, {
            gateway: {
                id: "image-generator",
                skipCache: false,
                cacheTtl: 3360
            }
        });

        if (!response || !response.response) {
            console.error('Fast optimization failed: No response received from LLM');
            throw new AutotuneError('No response received from LLM');
        }

        const optimizedPrompt = response.response.trim();
        console.log('Fast optimization successful');
        console.log(`Original prompt: "${userPrompt}"`);
        console.log(`Optimized prompt: "${optimizedPrompt}"`);
        
        return optimizedPrompt;
    } catch (error) {
        console.error('Error in fast optimization:', error);
        console.log('Falling back to original prompt');
        return userPrompt; // Fall back to original prompt if optimization fails
    }
}
