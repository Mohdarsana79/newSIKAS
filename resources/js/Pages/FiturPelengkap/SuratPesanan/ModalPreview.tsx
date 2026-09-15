import React from 'react';
import Modal from '@/Components/Modal';

export default function ModalPreview({ show, onClose, title, url }: { show: boolean, onClose: () => void, title: string, url: string }) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="6xl">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-between items-center border-b dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Preview: {title}
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
            </div>
            
            <div className="w-full h-[80vh] bg-gray-200 dark:bg-gray-900">
                {show && url && (
                    <iframe 
                        src={url} 
                        className="w-full h-full border-0"
                        title={title}
                    />
                )}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-end border-t dark:border-gray-700">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                    Tutup
                </button>
            </div>
        </Modal>
    );
}
