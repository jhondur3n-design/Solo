import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { WELCOME_TEXT } from '../../../constants';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WELCOME, HUNTER!" // More thematic title
      persistent={false} // Allow closing, it's not a strict warning anymore
      className="max-w-xl"
    >
      <div className="text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap text-center">
        {WELCOME_TEXT}
      </div>
      <div className="flex justify-center mt-6">
        <Button onClick={onClose} className="w-full max-w-[200px]">
          BEGIN SIMULATION
        </Button>
      </div>
    </Modal>
  );
};

export default WelcomeModal;