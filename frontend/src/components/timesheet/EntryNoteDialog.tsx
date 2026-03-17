'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

interface EntryNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargeCodeName: string;
  date: string;
  description: string;
  onSave: (description: string) => void;
}

export function EntryNoteDialog({
  open,
  onOpenChange,
  chargeCodeName,
  date,
  description,
  onSave,
}: EntryNoteDialogProps) {
  const [text, setText] = useState(description);

  useEffect(() => {
    if (open) {
      setText(description);
    }
  }, [open, description]);

  const formattedDate = (() => {
    try {
      return format(parseISO(date), 'EEE, MMM d');
    } catch {
      return date;
    }
  })();

  const handleSave = () => {
    onSave(text);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Note for {chargeCodeName} &middot; {formattedDate}
          </DialogTitle>
          <DialogDescription>
            Add a description or note for this time entry.
          </DialogDescription>
        </DialogHeader>
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter a note for this entry..."
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal-light)] resize-none"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--accent-teal)] hover:bg-teal-700 text-white"
            onClick={handleSave}
          >
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
