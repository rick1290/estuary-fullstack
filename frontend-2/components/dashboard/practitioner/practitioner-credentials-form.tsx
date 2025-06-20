"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Save, CheckCircle, Plus, Pencil, Trash2, MoveUp, MoveDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  practitionersMyProfileRetrieveOptions,
  practitionersCertificationsRetrieveOptions,
  practitionersEducationsRetrieveOptions,
  practitionersCertificationsCreateMutation,
  practitionersCertificationsUpdateMutation,
  practitionersCertificationsDestroyMutation,
  practitionersEducationsCreateMutation,
  practitionersEducationsUpdateMutation,
  practitionersEducationsDestroyMutation
} from "@/src/client/@tanstack/react-query.gen"

// Define types based on actual API structure
interface Certification {
  id: number
  certificate: string
  institution: string
  order: number
  issue_date?: string
  expiry_date?: string
}

interface Education {
  id: number
  degree: string
  educational_institute: string
  order: number
}

interface PractitionerCredentialsFormProps {
  isOnboarding?: boolean
}

export default function PractitionerCredentialsForm({ isOnboarding = false }: PractitionerCredentialsFormProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const [certDialogOpen, setCertDialogOpen] = useState(false)
  const [eduDialogOpen, setEduDialogOpen] = useState(false)
  const [editingCert, setEditingCert] = useState<Certification | null>(null)
  const [editingEdu, setEditingEdu] = useState<Education | null>(null)

  // Form states
  const [certName, setCertName] = useState("")
  const [certInstitution, setCertInstitution] = useState("")
  const [eduDegree, setEduDegree] = useState("")
  const [eduInstitution, setEduInstitution] = useState("")

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch practitioner profile to get ID
  const { data: practitioner } = useQuery(practitionersMyProfileRetrieveOptions())
  
  // Fetch certifications and educations
  const { data: certificationsData, isLoading: certsLoading, refetch: refetchCertifications } = useQuery({
    ...practitionersCertificationsRetrieveOptions({ path: { id: practitioner?.id || "" } }),
    enabled: !!practitioner?.id
  })
  
  const { data: educationsData, isLoading: edusLoading, refetch: refetchEducations } = useQuery({
    ...practitionersEducationsRetrieveOptions({ path: { id: practitioner?.id || "" } }),
    enabled: !!practitioner?.id
  })

  // Ensure data is always an array - handle both direct arrays and paginated responses
  const certifications = Array.isArray(certificationsData) ? certificationsData : 
                         (certificationsData?.results && Array.isArray(certificationsData.results)) ? certificationsData.results : []
  const educations = Array.isArray(educationsData) ? educationsData : 
                     (educationsData?.results && Array.isArray(educationsData.results)) ? educationsData.results : []
  const isLoading = certsLoading || edusLoading

  // Utility function to refresh all data
  const refreshAllData = () => {
    refetchCertifications()
    refetchEducations()
    queryClient.invalidateQueries()
  }

  // Setup mutations
  const createCertMutation = useMutation({
    ...practitionersCertificationsCreateMutation(),
    onSuccess: () => {
      refreshAllData()
      toast({
        title: "Certification Added",
        description: "Your certification has been added successfully.",
      })
    }
  })

  const updateCertMutation = useMutation({
    ...practitionersCertificationsUpdateMutation(),
    onSuccess: () => {
      refreshAllData()
      toast({
        title: "Certification Updated",
        description: "Your certification has been updated successfully.",
      })
    }
  })

  const deleteCertMutation = useMutation({
    ...practitionersCertificationsDestroyMutation(),
    onSuccess: () => {
      refreshAllData()
      toast({
        title: "Certification Removed",
        description: "The certification has been removed.",
      })
    }
  })

  const createEduMutation = useMutation({
    ...practitionersEducationsCreateMutation(),
    onSuccess: () => {
      refreshAllData()
      queryClient.invalidateQueries({ queryKey: ['practitionersMyProfileRetrieve'] })
      queryClient.invalidateQueries()
      toast({
        title: "Education Added",
        description: "Your education has been added successfully.",
      })
    }
  })

  const updateEduMutation = useMutation({
    ...practitionersEducationsUpdateMutation(),
    onSuccess: () => {
      refreshAllData()
      queryClient.invalidateQueries({ queryKey: ['practitionersMyProfileRetrieve'] })
      queryClient.invalidateQueries()
      toast({
        title: "Education Updated",
        description: "Your education has been updated successfully.",
      })
    }
  })

  const deleteEduMutation = useMutation({
    ...practitionersEducationsDestroyMutation(),
    onSuccess: () => {
      refreshAllData()
      queryClient.invalidateQueries({ queryKey: ['practitionersMyProfileRetrieve'] })
      queryClient.invalidateQueries()
      toast({
        title: "Education Removed",
        description: "The education entry has been removed.",
      })
    }
  })

  // Add or update certification
  const saveCertification = async () => {
    if (!certName || !certInstitution || !practitioner?.id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    const certData = {
      certificate: certName,
      institution: certInstitution,
      order: editingCert ? editingCert.order : certifications.length + 1
    }

    if (editingCert) {
      // Update existing certification
      updateCertMutation.mutate({
        path: { id: practitioner.id, cert_id: editingCert.id },
        body: certData
      })
    } else {
      // Add new certification
      createCertMutation.mutate({
        path: { id: practitioner.id },
        body: certData
      })
    }

    // Reset form and close dialog
    setCertName("")
    setCertInstitution("")
    setEditingCert(null)
    setCertDialogOpen(false)
  }

  // Add or update education
  const saveEducation = async () => {
    if (!eduDegree || !eduInstitution || !practitioner?.id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    const eduData = {
      degree: eduDegree,
      educational_institute: eduInstitution,
      order: editingEdu ? editingEdu.order : educations.length + 1
    }

    if (editingEdu) {
      // Update existing education
      updateEduMutation.mutate({
        path: { id: practitioner.id, edu_id: editingEdu.id },
        body: eduData
      })
    } else {
      // Add new education
      createEduMutation.mutate({
        path: { id: practitioner.id },
        body: eduData
      })
    }

    // Reset form and close dialog
    setEduDegree("")
    setEduInstitution("")
    setEditingEdu(null)
    setEduDialogOpen(false)
  }

  // Edit certification
  const editCertification = (cert: Certification) => {
    setEditingCert(cert)
    setCertName(cert.certificate)
    setCertInstitution(cert.institution)
    setCertDialogOpen(true)
  }

  // Edit education
  const editEducation = (edu: Education) => {
    setEditingEdu(edu)
    setEduDegree(edu.degree)
    setEduInstitution(edu.educational_institute)
    setEduDialogOpen(true)
  }

  // Delete certification
  const deleteCertification = (id: string | number) => {
    if (!practitioner?.id) return
    deleteCertMutation.mutate({
      path: { id: practitioner.id, cert_id: id.toString() }
    })
  }

  // Delete education
  const deleteEducation = (id: string | number) => {
    if (!practitioner?.id) return
    deleteEduMutation.mutate({
      path: { id: practitioner.id, edu_id: id.toString() }
    })
  }

  // Move certification up in order
  const moveCertUp = async (index: number) => {
    if (index <= 0 || !practitioner?.id) return
    const cert1 = certifications[index]
    const cert2 = certifications[index - 1]
    
    // Update both certifications with swapped order values
    await updateCertMutation.mutateAsync({
      path: { id: practitioner.id, cert_id: cert1.id },
      body: { ...cert1, order: cert2.order }
    })
    await updateCertMutation.mutateAsync({
      path: { id: practitioner.id, cert_id: cert2.id },
      body: { ...cert2, order: cert1.order }
    })
    
    queryClient.invalidateQueries({ queryKey: ['practitionersCertificationsList'] })
  }

  // Move certification down in order
  const moveCertDown = async (index: number) => {
    if (index >= certifications.length - 1 || !practitioner?.id) return
    const cert1 = certifications[index]
    const cert2 = certifications[index + 1]
    
    // Update both certifications with swapped order values
    await updateCertMutation.mutateAsync({
      path: { id: practitioner.id, cert_id: cert1.id },
      body: { ...cert1, order: cert2.order }
    })
    await updateCertMutation.mutateAsync({
      path: { id: practitioner.id, cert_id: cert2.id },
      body: { ...cert2, order: cert1.order }
    })
    
    queryClient.invalidateQueries({ queryKey: ['practitionersCertificationsList'] })
  }

  // Move education up in order
  const moveEduUp = async (index: number) => {
    if (index <= 0 || !practitioner?.id) return
    const edu1 = educations[index]
    const edu2 = educations[index - 1]
    
    // Update both education entries with swapped order values
    await updateEduMutation.mutateAsync({
      path: { id: practitioner.id, edu_id: edu1.id },
      body: { ...edu1, order: edu2.order }
    })
    await updateEduMutation.mutateAsync({
      path: { id: practitioner.id, edu_id: edu2.id },
      body: { ...edu2, order: edu1.order }
    })
    
    queryClient.invalidateQueries({ queryKey: ['practitionersEducationsList'] })
  }

  // Move education down in order
  const moveEduDown = async (index: number) => {
    if (index >= educations.length - 1 || !practitioner?.id) return
    const edu1 = educations[index]
    const edu2 = educations[index + 1]
    
    // Update both education entries with swapped order values
    await updateEduMutation.mutateAsync({
      path: { id: practitioner.id, edu_id: edu1.id },
      body: { ...edu1, order: edu2.order }
    })
    await updateEduMutation.mutateAsync({
      path: { id: practitioner.id, edu_id: edu2.id },
      body: { ...edu2, order: edu1.order }
    })
    
    queryClient.invalidateQueries({ queryKey: ['practitionersEducationsList'] })
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {!isOnboarding && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Credentials & Education</h2>
          <p className="text-muted-foreground">Share your qualifications and professional background.</p>
        </div>
      )}

      {/* Certifications Section */}
      <Card>
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
          <CardDescription>Add your professional certifications and licenses.</CardDescription>
        </CardHeader>
        <CardContent>
          {certifications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certifications.map((cert, index) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <Badge variant="outline">{cert.order}</Badge>
                    </TableCell>
                    <TableCell>{cert.certificate}</TableCell>
                    <TableCell>{cert.institution}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => moveCertUp(index)} disabled={index === 0}>
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveCertDown(index)}
                          disabled={index === certifications.length - 1}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => editCertification(cert)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCertification(cert.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No certifications added yet.</div>
          )}

          <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setEditingCert(null)
                  setCertName("")
                  setCertInstitution("")
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Certification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCert ? "Edit Certification" : "Add Certification"}</DialogTitle>
                <DialogDescription>Enter the details of your professional certification.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="certName">Certification Name</Label>
                  <Input
                    id="certName"
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    placeholder="e.g., Certified Personal Trainer"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="certInstitution">Issuing Institution</Label>
                  <Input
                    id="certInstitution"
                    value={certInstitution}
                    onChange={(e) => setCertInstitution(e.target.value)}
                    placeholder="e.g., National Academy of Sports Medicine"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCertDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCertification}>{editingCert ? "Update" : "Add"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Education Section */}
      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
          <CardDescription>Add your educational background and degrees.</CardDescription>
        </CardHeader>
        <CardContent>
          {educations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Degree</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {educations.map((edu, index) => (
                  <TableRow key={edu.id}>
                    <TableCell>
                      <Badge variant="outline">{edu.order}</Badge>
                    </TableCell>
                    <TableCell>{edu.degree}</TableCell>
                    <TableCell>{edu.educational_institute}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => moveEduUp(index)} disabled={index === 0}>
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveEduDown(index)}
                          disabled={index === educations.length - 1}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => editEducation(edu)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteEducation(edu.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No education entries added yet.</div>
          )}

          <Dialog open={eduDialogOpen} onOpenChange={setEduDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setEditingEdu(null)
                  setEduDegree("")
                  setEduInstitution("")
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Education
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEdu ? "Edit Education" : "Add Education"}</DialogTitle>
                <DialogDescription>Enter the details of your educational background.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="eduDegree">Degree/Qualification</Label>
                  <Input
                    id="eduDegree"
                    value={eduDegree}
                    onChange={(e) => setEduDegree(e.target.value)}
                    placeholder="e.g., Bachelor of Science in Nutrition"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eduInstitution">Educational Institution</Label>
                  <Input
                    id="eduInstitution"
                    value={eduInstitution}
                    onChange={(e) => setEduInstitution(e.target.value)}
                    placeholder="e.g., Stanford University"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEduDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveEducation}>{editingEdu ? "Update" : "Add"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

    </div>
  )
}
