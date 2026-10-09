/* Load the same reference assets when index.html is opened directly from disk. */
window.localReferenceReady = Promise.resolve();
if (location.protocol === 'file:') {
  window.localReferenceReady = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = './assets/local-resources.js';
    script.onerror = () => reject(new Error('The local reference asset bundle could not load.'));
    script.onload = () => {
      const resources = window.localReferenceResources;
      const urls = new Map();
      const assetURL = input => {
        const value = typeof input === 'string' ? input : input?.url || String(input);
        const start = value.indexOf('/assets/');
        if (start < 0) return input;
        const key = value.slice(start).split(/[?#]/)[0];
        const resource = resources[key];
        if (!resource) return input;
        if (!urls.has(key)) {
          const bytes = Uint8Array.from(atob(resource[1]), c => c.charCodeAt(0));
          urls.set(key, URL.createObjectURL(new Blob([bytes], { type: resource[0] })));
        }
        return urls.get(key);
      };

      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, options) => nativeFetch(assetURL(input), options);

      const imageSource = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        ...imageSource,
        set(value) { imageSource.set.call(this, assetURL(value)); }
      });

      const NativeAudio = window.Audio;
      window.Audio = function Audio(source) {
        return source === undefined ? new NativeAudio() : new NativeAudio(assetURL(source));
      };
      window.Audio.prototype = NativeAudio.prototype;
      resolve();
    };
    document.head.appendChild(script);
  });
}
