export interface StructuredAnalysis {
  meaning: string;
  phrases: {
    phrase: string;
    translation: string;
    explanation: string;
    isUniversal: boolean;
    learningPriority: string;
  }[];
  vocabulary: {
    word: string;
    explanation: string;
  }[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl?: string;
  lyrics?: string;
  sourceLanguage?: string;
  autoTranslation?: string;
  youtubeUrl?: string;
  authors?: string;
  lyricSource?: string;
  analysis?: {
    meaning: string;
    phrases: { 
      phrase: string; 
      translation?: string; 
      explanation: string;
      isUniversal?: boolean;
      learningPriority?: string;
    }[];
    vocabulary: { word: string; translation?: string; explanation: string }[];
  };
  structuredAnalysis?: StructuredAnalysis;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  geniusUrl?: string;
  musixmatchUrl?: string;
  lastfmUrl?: string;
  documentId?: string;
}

export const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Nocturne in E-Flat Major',
    artist: 'Frédéric Chopin',
    album: 'Classical Dreams',
    coverUrl: 'https://images.unsplash.com/photo-1514115485266-6ec79c12b266?q=80&w=1000&auto=format&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    youtubeUrl: 'https://www.youtube.com/watch?v=9E6b3swbnWg',
    lyrics: `(Instrumental)
    
This is a beautiful classical piece. 
No lyrics are available for this composition as it is purely instrumental.
Interpreted through the soul of the piano.`
  },
  {
    id: '2',
    title: 'Midnight City',
    artist: 'Urban Echo',
    album: 'Neon Lights',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    youtubeUrl: 'https://www.youtube.com/results?search_query=Urban+Echo+Midnight+City+official+video',
    sourceLanguage: 'en',
    lyrics: `Walking through the neon streets at night
Shadows dancing in the pale moonlight
Everything is moving at the speed of sound
In this city where we're never found

Midnight city, calling out my name
Nothing's ever really quite the same
In the electric haze of the falling rain
We wash away all the hidden pain`
  },
  {
    id: '3',
    title: 'Golden Hour',
    artist: 'Sunbeam',
    album: 'Endless Summer',
    coverUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    youtubeUrl: 'https://www.youtube.com/results?search_query=Sunbeam+Golden+Hour+official+video',
    sourceLanguage: 'en',
    lyrics: `The sun is dipping down below the sea
Everything is exactly where it ought to be
Gold on the water, gold in your eyes
The most perfect of all summer surprises

Wait for the moment, wait for the light
Before we drift into the deep of the night
Hold on to the warmth, hold on to the glow
This is the only world we need to know`
  },
  {
    id: '4',
    title: 'La Vie En Rose',
    artist: 'Edith Piaf',
    album: 'Greatest Hits',
    coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1000&auto=format&fit=crop',
    youtubeUrl: 'https://www.youtube.com/results?search_query=Edith+Piaf+La+Vie+En+Rose',
    sourceLanguage: 'fr',
    lyrics: `Quand il me prend dans ses bras
Il me parle tout bas
Je vois la vie en rose

Il me dit des mots d'amour
Des mots de tous les jours
Et ça me fait quelque chose`
  }
];
