import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    publicId?: string;
    format?: string;
    transformation?: Record<string, unknown>[];
  } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "thecoregamer",
        public_id: options.publicId,
        format: options.format || "webp",
        resource_type: "image",
        transformation: options.transformation,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("No result from Cloudinary"));
          return;
        }
        resolve({
          publicId: result.public_id,
          url: result.url,
          secureUrl: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export async function listCloudinaryAssets(
  options: {
    folder?: string;
    maxResults?: number;
    nextCursor?: string;
    prefix?: string;
    altText?: string;
  } = {}
) {
  const baseFolder = options.folder || "thecoregamer";
  let expression = `folder:${baseFolder}/*`;

  if (options.prefix && options.prefix !== options.folder) {
    // If a prefix is provided and it's different from the folder, add a filename search
    expression += ` AND filename:${options.prefix.split("/").pop()}*`;
  }

  if (options.altText) {
    expression += ` AND context.alt:${options.altText}*`;
  }

  let search = cloudinary.search
    .expression(expression)
    .sort_by("created_at", "desc")
    .with_field("context")
    .max_results(options.maxResults || 20);

  if (options.nextCursor) {
    search = search.next_cursor(options.nextCursor);
  }

  return search.execute();
}

export { cloudinary };
export default cloudinary;
