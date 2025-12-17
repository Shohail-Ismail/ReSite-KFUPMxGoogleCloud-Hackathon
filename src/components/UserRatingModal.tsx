import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { createUserRating } from '@/services/firestoreService';
import { logUserRated } from '@/services/analyticsService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserRatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ratedUserId: string;
  ratedUserName: string;
  raterId: string;
  transactionType: 'listing' | 'request';
  transactionId: string;
  transactionTitle: string;
  onRatingComplete?: () => void;
}

export function UserRatingModal({
  open,
  onOpenChange,
  ratedUserId,
  ratedUserName,
  raterId,
  transactionType,
  transactionId,
  transactionTitle,
  onRatingComplete,
}: UserRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      await createUserRating({
        ratedUserId,
        raterUserId: raterId,
        rating,
        review: review.trim() || undefined,
        transactionType,
        transactionId,
      });

      await logUserRated(raterId, ratedUserId, rating, transactionType, transactionId);

      toast.success('Thank you for your feedback!');
      onOpenChange(false);
      onRatingComplete?.();
      
      // Reset state
      setRating(0);
      setReview('');
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  const getRatingLabel = (value: number) => {
    switch (value) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select a rating';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your experience with <span className="font-semibold text-foreground">{ratedUserName}</span> for "{transactionTitle}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
                >
                  <Star
                    className={cn(
                      'w-10 h-10 transition-colors',
                      value <= displayRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-muted-foreground/40'
                    )}
                  />
                </button>
              ))}
            </div>
            <p className={cn(
              'text-sm font-medium transition-colors',
              displayRating > 0 ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {getRatingLabel(displayRating)}
            </p>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <label htmlFor="review" className="text-sm font-medium text-foreground">
              Share your experience (optional)
            </label>
            <Textarea
              id="review"
              placeholder="Tell others about your experience working with this user..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Your review helps build trust in the marketplace
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="min-w-[100px]"
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
