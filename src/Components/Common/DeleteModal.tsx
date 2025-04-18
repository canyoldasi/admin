import { Modal, ModalBody } from "reactstrap";

const DeleteModal = ({ show, onDeleteClick, onCloseClick, recordId, backdrop }: any) => {
  return (
    <Modal isOpen={show} toggle={onCloseClick} centered={true} backdrop={backdrop || true}>
      <ModalBody className="py-3 px-5">
        <div className="mt-2 text-center">
        <i className="ri-delete-bin-line display-5 text-danger"></i>
          
            <p className="text-muted mx-4 mb-0 mt-3 text-[3rem]">
              Are you sure you want to delete the reservation? {recordId ? recordId : ""} ?
            </p>
         
        </div>
        <div className="d-flex gap-2 justify-content-center mt-4 mb-2">
          <button
            type="button"
            className="btn w-sm btn-danger "
            id="delete-record"
            onClick={onDeleteClick}
          >
            DELETE
          </button>
          <button
            type="button"
            className="btn w-sm btn-light"
            data-bs-dismiss="modal"
            onClick={onCloseClick}
          >
            CANCEL
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default DeleteModal;