import { Mp3Encoder } from '@breezystack/lamejs';
import type { Track } from '@/types';

export type ExportFormat = 'mp3' | 'wav';

const MP3_KBPS = 192;
const MP3_BLOCK_SIZE = 1152;

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ');
  return cleaned || 'track';
}

function floatTo16BitPcm(channel: Float32Array): Int16Array {
  const out = new Int16Array(channel.length);
  for (let i = 0; i < channel.length; i++) {
    const s = Math.max(-1, Math.min(1, channel[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Int16Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(floatTo16BitPcm(buffer.getChannelData(ch)));
  }

  let offset = 44;
  for (let frame = 0; frame < numFrames; frame++) {
    for (let ch = 0; ch < numChannels; ch++) {
      view.setInt16(offset, channels[ch][frame], true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function encodeMp3(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(buffer.numberOfChannels, 2);
  const encoder = new Mp3Encoder(numChannels, buffer.sampleRate, MP3_KBPS);

  const left = floatTo16BitPcm(buffer.getChannelData(0));
  const right = numChannels === 2 ? floatTo16BitPcm(buffer.getChannelData(1)) : undefined;

  const chunks: Uint8Array[] = [];
  for (let i = 0; i < left.length; i += MP3_BLOCK_SIZE) {
    const leftChunk = left.subarray(i, i + MP3_BLOCK_SIZE);
    const rightChunk = right?.subarray(i, i + MP3_BLOCK_SIZE);
    const encoded = encoder.encodeBuffer(leftChunk, rightChunk);
    if (encoded.length > 0) chunks.push(encoded);
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(tail);

  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sourceExtension(audioUrl: string): string {
  const path = audioUrl.split('?')[0];
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
}

export async function exportTrack(track: Track, format: ExportFormat): Promise<void> {
  if (!track.audio_url) {
    throw new Error('Трек не має аудіофайлу.');
  }

  const response = await fetch(track.audio_url);
  if (!response.ok) {
    throw new Error('Не вдалося завантажити аудіо.');
  }
  const sourceBytes = await response.arrayBuffer();
  const fileName = `${sanitizeFileName(track.title)}.${format}`;

  // Same container as requested — hand over the original bytes untouched.
  if (sourceExtension(track.audio_url) === format) {
    const type = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    triggerDownload(new Blob([sourceBytes], { type }), fileName);
    return;
  }

  const audioCtx = new AudioContext();
  try {
    const decoded = await audioCtx.decodeAudioData(sourceBytes);
    const blob = format === 'wav' ? encodeWav(decoded) : encodeMp3(decoded);
    triggerDownload(blob, fileName);
  } finally {
    void audioCtx.close();
  }
}
