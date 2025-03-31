import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const isVideoExists = await Video.exists({ _id: videoId });

  if (!isVideoExists) {
    throw new ApiError(404, "Video not found");
  }

  const options = { page, limit };

  const aggregationPipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ];

  const results = await Comment.aggregatePaginate(
    Comment.aggregate(aggregationPipeline),
    options,
  );

  if (results.totalDocs === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video has no comments"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video

  const { videoId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  if (!videoId || !content) {
    throw new ApiError(400, "Please provide videoId and content");
  }

  if (!isValidObjectId(videoId) || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid videoId or userId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const comment = await Comment.create({
    content,
    videoId,
    userId,
  });

  if (!comment) {
    throw new ApiError(400, "Failed to add comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment created succesfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a

  const { commentId } = req.params;
  const { content } = req.body;
  if (!commentId || !content) {
    throw new ApiError(400, "Please provide commentId");
  }
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const newComment = await Comment.findByIdAndUpdate(
    commentId,
    { $set: { content } },
    { new: true },
  );

  if (!newComment) {
    throw new ApiError(400, "Failed to update comment");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Please provide commentId");
  }
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }
  const comment = await Comment.findByIdAndDelete(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
