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
import type { Certification, Education } from "@/types/practitioner"

// Mock function to get practitioner credentials
const getPractitionerCredentials = async () => {
  // In a real app, this would fetch from an API
  return {
    certifications: [
      {
        id: "3563b688-4d4e-41f2-be33-0ab1067aff99",
        certificate: "Certified Personal Trainer",
        institution: "National Academy of Sports Medicine",
        order: 1,
      },
      {
        id: "d7480e8b-1e5e-4a4f-b896-f8d64f8be980",
        certificate: "Life Coach Certification",
        institution: "International Coaching Federation",
        order: 2,
      },
    ],
    educations: [
      {
        id: "e8f045be-d8d5-40cb-b6cb-8d0c51e279ed",
        degree: "Doctorate in Physical Therapy",
        educational_institute: "University of California",
        order: 1,
      },
      {
        id: "f9a12c34-5678-90ab-cdef-ghijklmnopqr",
        degree: "Bachelor of Science in Nutrition",
        educational_institute: "Stanford University",
        order: 2,
      },
    ],
  }
}

interface PractitionerCredentialsFormProps {
  isOnboarding?: boolean
}

export default function PractitionerCredentialsForm({ isOnboarding = false }: PractitionerCredentialsFormProps) {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [educations, setEducations] = useState<Education[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Dialog states
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

  // Load practitioner credentials
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getPractitionerCredentials()
        setCertifications(data.certifications)
        setEducations(data.educations)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to load practitioner credentials:", error)
        toast({
          title: "Error",
          description: "Failed to load your credentials. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    loadData()
  }, [toast])

  // Save all changes
  const saveChanges = async () => {
    setIsSaving(true)
    try {
      // In a real app, this would send data to an API
      console.log("Saving credentials:", { certifications, educations })

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

      toast({
        title: "Credentials Updated",
        description: "Your credentials have been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to save credentials:", error)
      toast({
        title: "Error",
        description: "Failed to save your credentials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Add or update certification
  const saveCertification = () => {
    if (!certName || !certInstitution) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (editingCert) {
      // Update existing certification
      setCertifications((prev) =>
        prev.map((cert) =>
          cert.id === editingCert.id ? { ...cert, certificate: certName, institution: certInstitution } : cert,
        ),
      )
    } else {
      // Add new certification
      const newCert: Certification = {
        id: `cert-${Date.now()}`,
        certificate: certName,
        institution: certInstitution,
        order: certifications.length + 1,
      }
      setCertifications((prev) => [...prev, newCert])
    }

    // Reset form and close dialog
    setCertName("")
    setCertInstitution("")
    setEditingCert(null)
    setCertDialogOpen(false)
  }

  // Add or update education
  const saveEducation = () => {
    if (!eduDegree || !eduInstitution) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (editingEdu) {
      // Update existing education
      setEducations((prev) =>
        prev.map((edu) =>
          edu.id === editingEdu.id ? { ...edu, degree: eduDegree, educational_institute: eduInstitution } : edu,
        ),
      )
    } else {
      // Add new education
      const newEdu: Education = {
        id: `edu-${Date.now()}`,
        degree: eduDegree,
        educational_institute: eduInstitution,
        order: educations.length + 1,
      }
      setEducations((prev) => [...prev, newEdu])
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
  const deleteCertification = (id: string) => {
    setCertifications((prev) => prev.filter((cert) => cert.id !== id))
    toast({
      title: "Certification Removed",
      description: "The certification has been removed.",
    })
  }

  // Delete education
  const deleteEducation = (id: string) => {
    setEducations((prev) => prev.filter((edu) => edu.id !== id))
    toast({
      title: "Education Removed",
      description: "The education entry has been removed.",
    })
  }

  // Move certification up in order
  const moveCertUp = (index: number) => {
    if (index <= 0) return
    const newCerts = [...certifications]
    const temp = newCerts[index]
    newCerts[index] = newCerts[index - 1]
    newCerts[index - 1] = temp

    // Update order values
    newCerts.forEach((cert, i) => {
      cert.order = i + 1
    })

    setCertifications(newCerts)
  }

  // Move certification down in order
  const moveCertDown = (index: number) => {
    if (index >= certifications.length - 1) return
    const newCerts = [...certifications]
    const temp = newCerts[index]
    newCerts[index] = newCerts[index + 1]
    newCerts[index + 1] = temp

    // Update order values
    newCerts.forEach((cert, i) => {
      cert.order = i + 1
    })

    setCertifications(newCerts)
  }

  // Move education up in order
  const moveEduUp = (index: number) => {
    if (index <= 0) return
    const newEdus = [...educations]
    const temp = newEdus[index]
    newEdus[index] = newEdus[index - 1]
    newEdus[index - 1] = temp

    // Update order values
    newEdus.forEach((edu, i) => {
      edu.order = i + 1
    })

    setEducations(newEdus)
  }

  // Move education down in order
  const moveEduDown = (index: number) => {
    if (index >= educations.length - 1) return
    const newEdus = [...educations]
    const temp = newEdus[index]
    newEdus[index] = newEdus[index + 1]
    newEdus[index + 1] = temp

    // Update order values
    newEdus.forEach((edu, i) => {
      edu.order = i + 1
    })

    setEducations(newEdus)
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

      <div className="flex justify-end">
        <Button onClick={saveChanges} disabled={isSaving}>
          {isSaving ? (
            <>Saving...</>
          ) : showSuccess ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
