import React, { useState } from 'react'
import styles from './ImageGenerator.module.css'


const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState('@cf/black-forest-labs/flux-1-schnell')
  const [autoTune, setAutoTune] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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
        },
        body: JSON.stringify({ prompt, autoTune }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate image')
      }

      // Get the optimization metadata from headers
      const optimizedPrompt = response.headers.get('X-Optimized-Prompt')
      const optimizationStatus = response.headers.get('X-Optimization-Status')
      const errorMessage = response.headers.get('X-Error-Message')

      // Get the base64 image data directly
      const imageData = await response.text()
      setImage(imageData) // This will be a data URL that can be used directly in an img src
      setOptimizedPrompt(optimizedPrompt || prompt)
      
      if (errorMessage) {
        console.warn('Optimization warning:', errorMessage)
      }
    } catch (err) {
      setError('Error generating image. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Prompt copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy text: ', err)
    })
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>AI Image Generator</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your image prompt here..."
          className={styles.textarea}
          rows={4}
        />
        <div>
          <label>
            <input
              type="checkbox"
              checked={autoTune}
              onChange={(e) => setAutoTune(e.target.checked)}
              className={styles.checkbox}
            />
            Auto-tune prompt
          </label>
        </div>
        <div>
          <label htmlFor="model-select">Select Model:</label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={styles.select}
          >
            <option value="@cf/black-forest-labs/flux-1-schnell">Flux 1 Schnell</option>
            <option value="@cf/black-forest-labs/flux-1-beta">Flux 1 Beta</option>
          </select>
        </div>
        <button
          type="submit"
          className={styles.button}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Image'}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
      {image && (
        <div className={styles.imageContainer}>
          <h2 className={styles.imageTitle}>Generated Image:</h2>
          <img src={image} alt="Generated" className={styles.image} />
          {optimizedPrompt && (
            <div className={styles.promptContainer}>
              <h3 className={styles.promptTitle}>Optimized Prompt:</h3>
              <p className={styles.prompt}>{optimizedPrompt}</p>
              <button 
                className={styles.copyButton} 
                onClick={() => copyToClipboard(optimizedPrompt)}
              >
                📋
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImageGenerator
