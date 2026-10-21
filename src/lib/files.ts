import api from '@/lib/api';

// Submission files are fetched through the authenticated download endpoint
// (it checks who may see the file), never through a public /storage URL.

const fetchSubmissionBlob = async (submissionId: number): Promise<Blob> => {
    const response = await api.get(`/api/submissions/${submissionId}/download`, { responseType: 'blob' });
    return response.data;
};

export const downloadSubmission = async (submissionId: number, filename: string) => {
    const url = URL.createObjectURL(await fetchSubmissionBlob(submissionId));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** Opens the file in a new tab (PDFs preview in the browser; other types download). */
export const viewSubmission = async (submissionId: number) => {
    // Open the tab first so pop-up blockers allow it, then load the file into it
    const tab = window.open('', '_blank');
    try {
        const url = URL.createObjectURL(await fetchSubmissionBlob(submissionId));
        if (tab) {
            tab.location.href = url;
        } else {
            window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
        tab?.close();
        throw error;
    }
};

export const submissionFilename = (submissionId: number, filePath: string | null) =>
    `submission-${submissionId}.${filePath?.split('.').pop() ?? 'pdf'}`;
