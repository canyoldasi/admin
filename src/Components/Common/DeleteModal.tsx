import { Modal, ModalBody } from "reactstrap";

interface DeleteModalProps {
  show: boolean;
  onDeleteClick: () => void;
  onCloseClick: () => void;
  recordId?: string;
  recordName?: string;
  itemType?: string;
}

const DeleteModal = ({ 
  show, 
  onDeleteClick, 
  onCloseClick, 
  recordId,
  recordName,
  itemType = "kayıt" 
}: DeleteModalProps) => {
  return (
    <Modal isOpen={show} toggle={onCloseClick} centered={true}>
      <ModalBody className="py-3 px-5">
        <div className="mt-2 text-center">
          <i className="ri-delete-bin-line display-5 text-danger"></i>
          
          <p className="text-muted mx-4 mb-0 mt-3 text-[3rem]">
            Bu {itemType}{recordName ? ` "${recordName}"` : ''} silmek istediğinize emin misiniz?
          </p>
        </div>
        <div className="d-flex gap-2 justify-content-center mt-4 mb-2">
          <button
            type="button"
            className="btn w-sm btn-light"
            data-bs-dismiss="modal"
            onClick={onCloseClick}
          >
            Kapat
          </button>
          <button
            type="button"
            className="btn w-sm btn-danger"
            id="delete-record"
            onClick={onDeleteClick}
          >
            Sil
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default DeleteModal;