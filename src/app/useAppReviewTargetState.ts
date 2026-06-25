import { useState } from "react";
import type { BitbucketReviewTargetMode } from "../../shared/types";

export const useAppReviewTargetState = () => {
  const [reviewTargetMode, setReviewTargetMode] = useState<BitbucketReviewTargetMode>("reviewed-ticket");

  return {
    reviewTargetMode,
    setReviewTargetMode
  };
};
