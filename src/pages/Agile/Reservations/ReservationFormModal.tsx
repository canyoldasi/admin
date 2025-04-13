import React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  Input,
  Button
} from "reactstrap";
import ReservationForm, { FormProps } from "./ReservationForm";

interface TransactionFormModalProps extends FormProps {
  isOpen: boolean;
  toggle: () => void;
  title: string;
  submitText?: string;
  cancelText?: string;
  onSubmit: (e: React.FormEvent) => void;
  formik?: any; // Formik instance if different from validation
}

const ReservationFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  toggle,
  title,
  submitText = "Kaydet",
  cancelText = "İptal",
  onSubmit,
  formik,
  isDetail = false,
  isSubmitting = false,
  ...formProps
}) => {
  // Use formik if provided, otherwise use validation from formProps
  const formikInstance = formik || formProps.validation;

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="lg" backdrop="static">
      <ModalHeader className="bg-light p-3" toggle={toggle}>
        {title}
      </ModalHeader>
      <Form 
        className="tablelist-form" 
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
        }}
      >
        <ModalBody>
          <Input type="hidden" id="id-field" />
          <ReservationForm 
            {...formProps}
            validation={formikInstance}
            isDetail={isDetail}
            isSubmitting={isSubmitting}
          />
        </ModalBody>
        <ModalFooter>
          <div className="hstack gap-2 justify-content-end">
            <Button color="light" onClick={toggle}>
              {cancelText}
            </Button>
            {!isDetail && (
              <Button type="submit" color="primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="d-flex align-items-center">
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    <span>Kaydediliyor...</span>
                  </span>
                ) : (
                  submitText
                )}
              </Button>
            )}
          </div>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default ReservationFormModal; 