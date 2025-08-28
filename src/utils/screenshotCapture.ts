import html2canvas from 'html2canvas';

interface CaptureOptions {
  url: string;
  timeout?: number;
  retries?: number;
}

interface CaptureResult {
  screenshot?: string;
  html?: string;
  error?: string;
  method?: 'iframe' | 'html2canvas' | 'api' | 'html-fallback';
}

export class ScreenshotCapture {
  private static async captureWithIframe(url: string, timeout = 10000): Promise<string | null> {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.width = '1280px';
      iframe.style.height = '720px';
      iframe.src = url;

      const timeoutId = setTimeout(() => {
        document.body.removeChild(iframe);
        resolve(null);
      }, timeout);

      iframe.onload = async () => {
        clearTimeout(timeoutId);
        try {
          // Wait for content to render
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to capture iframe content
          const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDocument) {
            const canvas = await html2canvas(iframeDocument.body, {
              useCORS: true,
              allowTaint: true,
              scale: 1,
              logging: false,
              width: 1280,
              height: 720
            });
            const screenshot = canvas.toDataURL('image/png');
            document.body.removeChild(iframe);
            resolve(screenshot);
          } else {
            document.body.removeChild(iframe);
            resolve(null);
          }
        } catch (error) {
          console.error('iframe capture error:', error);
          document.body.removeChild(iframe);
          resolve(null);
        }
      };

      iframe.onerror = () => {
        clearTimeout(timeoutId);
        document.body.removeChild(iframe);
        resolve(null);
      };

      document.body.appendChild(iframe);
    });
  }

  private static async captureWithHtml2Canvas(): Promise<string | null> {
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        windowWidth: 1280,
        windowHeight: 720
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('html2canvas error:', error);
      return null;
    }
  }

  private static async captureWithAPI(url: string): Promise<string | null> {
    try {
      // Use a screenshot API service (you'll need to set up an API endpoint)
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) throw new Error('Screenshot API failed');
      
      const { screenshot } = await response.json();
      return screenshot;
    } catch (error) {
      console.error('Screenshot API error:', error);
      return null;
    }
  }

  private static async fetchHTMLContent(url: string): Promise<string | null> {
    try {
      // Try to fetch through a proxy to avoid CORS
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Failed to fetch HTML');
      
      const html = await response.text();
      // Extract form-related content
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const forms = doc.querySelectorAll('form');
      
      let formHTML = '';
      forms.forEach((form, index) => {
        formHTML += `\n--- Form ${index + 1} ---\n`;
        formHTML += form.outerHTML;
      });
      
      return formHTML || html.substring(0, 10000); // Limit size
    } catch (error) {
      console.error('HTML fetch error:', error);
      return null;
    }
  }

  public static async capture(options: CaptureOptions): Promise<CaptureResult> {
    const { url, timeout = 10000, retries = 3 } = options;
    
    console.log(`📸 Attempting to capture: ${url}`);
    
    // Try different capture methods in order of preference
    const methods: Array<{ 
      name: 'iframe' | 'html2canvas' | 'api' | 'html-fallback';
      fn: () => Promise<string | null>;
    }> = [
      { 
        name: 'iframe', 
        fn: () => this.captureWithIframe(url, timeout) 
      },
      { 
        name: 'html2canvas', 
        fn: () => this.captureWithHtml2Canvas() 
      },
      { 
        name: 'api', 
        fn: () => this.captureWithAPI(url) 
      }
    ];

    for (const method of methods) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        console.log(`🔄 Trying ${method.name} (attempt ${attempt}/${retries})`);
        
        try {
          const screenshot = await method.fn();
          
          if (screenshot && screenshot !== 'data:,') {
            console.log(`✅ Successfully captured with ${method.name}`);
            return { 
              screenshot, 
              method: method.name 
            };
          }
        } catch (error) {
          console.error(`❌ ${method.name} failed:`, error);
        }
        
        // Wait before retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // All screenshot methods failed, try HTML fallback
    console.log('📄 Falling back to HTML content extraction');
    const html = await this.fetchHTMLContent(url);
    
    if (html) {
      return { 
        html, 
        method: 'html-fallback' 
      };
    }

    return { 
      error: 'All capture methods failed' 
    };
  }
}

// Export a simple capture function for easy use
export async function capturePageContent(url: string): Promise<CaptureResult> {
  return ScreenshotCapture.capture({ url });
}