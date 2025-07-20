// components/VideoPlayer.tsx
import * as React from 'react';

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  id?: string;
  name?: string;
  title?: string;
  loop?: boolean;
  poster?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  autoPlay = false,
  muted = true,
  controls = true,
  loop = false,
  className = '',
  id = `video-${Math.random().toString(36).substr(2, 9)}`,
  name,
  title = 'Video Player',
  poster,
  onPlay,
  onPause,
  onEnded,
  onError
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let playAttempt: any;
    let isMounted = true;

    const handlePlay = async () => {
      if (!isMounted || !autoPlay) return;
      
      try {
        videoElement.muted = muted;
        videoElement.playsInline = true;
        
        if (videoElement.paused) {
          playAttempt = videoElement.play();
          if (playAttempt !== undefined) {
            await playAttempt;
            if (isMounted) {
              setIsPlaying(true);
              onPlay?.();
            }
          }
        }
      } catch (error) {
        console.warn('Video playback failed:', error);
        if (isMounted) {
          setIsPlaying(false);
          setHasError(true);
          onError?.(error as Error);
        }
      }
    };

    const handlePause = () => {
      if (isMounted) {
        setIsPlaying(false);
        onPause?.();
      }
    };

    const handleEnded = () => {
      if (isMounted) {
        setIsPlaying(false);
        onEnded?.();
      }
    };

    const handleError = () => {
      if (isMounted) {
        setHasError(true);
        onError?.(new Error('Video playback error'));
      }
    };

    // Add event listeners
    videoElement.addEventListener('loadedmetadata', handlePlay);
    videoElement.addEventListener('play', () => {
      setIsPlaying(true);
      onPlay?.();
    });
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('error', handleError);

    // Initial setup
    if (videoElement.readyState > 0) {
      handlePlay();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (playAttempt) {
        playAttempt.catch(() => {});
      }
      videoElement.removeEventListener('loadedmetadata', handlePlay);
      videoElement.removeEventListener('play', () => onPlay?.());
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('error', handleError);
    };
  }, [autoPlay, muted, src, onPlay, onPause, onEnded, onError]);

  // Handle component unmount
  React.useEffect(() => {
    // Store the ref in a variable to use in cleanup
    const videoElement = videoRef.current;
    
    return () => {
      if (videoElement && !videoElement.paused) {
        videoElement.pause();
        onPause?.();
      }
    };
  }, [onPause]);

  return (
    <div 
      className={`video-container ${className} ${hasError ? 'video-error' : ''}`}
      role="region"
      aria-label={title}
      data-playing={isPlaying}
    >
      <video
        ref={videoRef}
        id={id}
        src={src}
        controls={controls}
        playsInline
        preload="metadata"
        className={`w-full h-auto ${hasError ? 'opacity-50' : ''}`}
        muted={muted}
        loop={loop}
        poster={poster}
        style={{ display: 'block' }}
        aria-label={title}
        title={title}
        aria-describedby={title ? undefined : `${id}-desc`}
        aria-errormessage={hasError ? `${id}-error` : undefined}
      />
      
      {!title && (
        <div id={`${id}-desc`} className="sr-only">
          Video player
        </div>
      )}
      
      {hasError && (
        <div id={`${id}-error`} className="text-red-600 text-sm mt-2">
          Error: Could not load the video.
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;